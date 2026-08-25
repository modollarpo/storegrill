# Vendor & User Onboarding Plan

Status: PHASES A & B SHIPPED + B LEFTOVERS CLOSED · Grounded in `PROJECT.md` §F1/F3/F10, `docs/architecture.md`, current `apps/api` code and Prisma schema.

## Shipped (as of this revision)

**Phase A — user onboarding foundation.** Register hardening (role forced `CUSTOMER`, lowercase emails), `EmailToken` model + verify/resend/forgot/reset endpoints (hashed single-use tokens, anti-enumeration), `requireVerifiedEmail` gate on checkout + reviews, `/auth/verify-email` page, account verification banner with resend, ACS-only mailer (`apps/api/src/lib/mailer.ts`, console transport in dev). Verified by `apps/api/scripts/smoke-auth.ts` (12/12).

**Phase B — vendor application pipeline.**
- Schema: `VendorProfile` extended (business legal fields, warehouse region, planned categories, `onboardingStep`, submission/review audit columns) + new `VendorPayoutAccount` and `PlatformConfig` models; seed row `vendorCommissionPct=12`.
- API: `POST /vendors/apply` (progressive draft save, step-tracked), `POST /vendors/apply/submit` (completeness check → `UNDER_REVIEW`, commission snapshot from config), `GET /vendors/application`, admin `POST /vendors/:id/approve|reject` with **storefront auto-provisioning** (warehouse region + US, slug collision handling), role promotion on approval, storefront disable on suspend/ban, AuditLog entries on every transition, decision emails via mailer.
- Shared: step schemas (`VendorBusinessStepSchema` etc.), flat `VendorPayoutPatchSchema`, `VendorApplicationPatchSchema`; empty-string optionals normalized to `undefined`.
- Web: 4-step wizard at `/vendor/apply` (resume/reject-notes/reapply aware), `/sell` CTA rewired.
- Verified by `apps/api/scripts/smoke-vendor.ts` (36/36) + browser E2E of the wizard (signup-gate → sign-in → all steps → submit).

**Infrastructure fixes made along the way** (affect the whole API):
- Express 4 async-handler rejections crashed the process; fixed by an express-async-errors-style Layer patch in `src/lib/express-async-patch.ts` (imported first in `index.ts`) plus an `unhandledRejection` guard.
- ZodError detection is structural (`isZodError`) — `instanceof` broke under tsx's dual zod instances; error logging is inspect-proof for Node ≥24.
- Rate limits are environment-aware (auth: 100/15 min dev, 10/15 min prod).
- Pre-existing bug fixed: `GET /vendors/:slug` shadowed `/vendors/me*`; dynamic route moved to last.

**Phase B leftovers (closed).**
- **Session revocation**: `User.tokenVersion` embedded in both JWTs; `authenticate` and `/auth/refresh` compare against the DB (`401 SESSION_REVOKED` on mismatch) and read the role fresh from the DB, so approval promotions take effect without re-login. `POST /auth/reset-password` bumps `tokenVersion`, instantly killing every issued refresh token.
- **Resend-verification limiter**: per-user `express-rate-limit` (3/hour prod, 30/hour dev).
- **Region preference**: `PUT /auth/preferences {preferredRegionKey}` validates against enabled `Region` rows and upserts `CustomerProfile` (+ currency default); `/auth/me` already returns it. Web account shows a region card (verified users only) listing regions fetched live from `GET /regions` — the picker is DB-driven, never a hardcoded list.
- **KYC documents**: `@azure/storage-blob` approved + installed. `POST /vendors/me/documents` (base64 ≤ 5 MB, max 10 files, private container `kyc-docs`) and `GET /vendors/me/documents`; admin `GET /admin/vendors/:id/documents` returns 10-minute SAS read URLs. Without `AZURE_STORAGE_CONNECTION_STRING` upload degrades to a clean `503 STORAGE_NOT_CONFIGURED`. Wizard step 4 has an optional uploader with graceful degradation.
- **Admin review queue**: `apps/admin/src/app/vendors/page.tsx` rebuilt — status filters, expandable application detail (business/operations/payout/documents), approve, reject-with-notes (notes prefilled for reapplicants), suspend/reactivate; documents load lazily as signed links.
- **Vendor portal applicant state**: login admits non-sellers who have an application; shell renders a minimal applicant chrome and the dashboard shows PENDING / UNDER_REVIEW / REJECTED screens (reviewer notes on rejection, reapply CTA) instead of seller dashboards.

Verified by `smoke-auth.ts` (18/18 — incl. refresh-token revocation after reset, preferences roundtrip), `smoke-vendor.ts` (36/36), root gates (`typecheck` ×5 workspaces, `lint` 0 errors, `vitest` 91/91), and browser E2E of the admin queue, account region card (persist across reload) and portal applicant gate.

## Remaining (Phase C)
- OAuth providers, 2FA fields already in schema but unused (needs provider creds).
- ACS Email live smoke test once real credentials exist.
- Campaign hero imagery broken (deleted JPEGs referenced by `CampaignHero`).

## 0. Current state (what exists today)

| Piece | State |
|---|---|
| Register/login | `POST /api/v1/auth/register`, `/login` — bcrypt(12), JWT access (15 min cookie) + refresh (7 d). ⚠️ Register currently trusts `body.role` — any caller can self-assign a role. |
| Customer profile | Auto-created on register (`preferredRegionKey`, currency, language, addresses JSON). |
| Email verification / reset / 2FA | **Not implemented** (required by F1). |
| OAuth | `OAuthAccount` model + `src/auth/oauth` scaffold exist; providers unconfigured. |
| Vendor profile | `VendorProfile` model exists (`kycStatus`, `kycData` JSON, `payoutMethod`, `revenueSharePct`, `status=PENDING`) but **no write API** — nobody can become a vendor yet. |
| Vendor portal | Next app with login/products/orders/payouts/imports/settings pages; gates unknown to API status. |
| `/sell` page | Marketing copy promises "apply in minutes", "verification ~2 working days", 12% flat commission — **no application flow behind it yet**. |
| `VendorPayoutAccount` | In `PROJECT.md` §5 entity list but **missing from schema**. |

## 1. Customer onboarding (web)

```
/signup → account created (role locked to CUSTOMER server-side)
        → email verification required (soft-gate: browse allowed, checkout/review blocked)
        → region & locale picker (defaults from geo/region config — never hardcoded)
        → done; profile editable at /account
```

Flow details:
1. **Signup form**: name, email, password (+ confirm). Zod `RegisterSchema` extended with `confirm`; password policy ≥ 10 chars, checked against top-10k common list (static file, no service).
2. **Verification email** (ACS Email in prod; console transport locally): signed token (random 32 B, hashed in DB) valid 24 h, single-use. `POST /auth/verify-email`, `POST /auth/resend-verification` (rate-limited 3/hour).
3. **Soft gate**: middleware flag on session (`emailVerified=false`) blocks checkout, reviews, wishlist sync; browsing/cart stay open.
4. **Region preference**: after verify, one-tap "ship to" card using region config data (currency/language defaults come from the `Region` row — region is data, not code).
5. **Password reset**: `POST /auth/forgot-password` (always 200 to avoid enumeration) → emailed reset link (1 h token) → `POST /auth/reset-password` revokes all refresh tokens.
6. **OAuth (phase 2)**: Google/Microsoft via existing `oauthAccounts` table; same soft-gate rules.

## 2. Vendor onboarding (web → admin → vendor-portal)

Prerequisite: a logged-in account (customer accounts can apply; role stays `CUSTOMER` until approval).

### 2.1 Application wizard (`/vendor/apply`, linked from `/sell` CTA)

Four steps mirroring the existing `/sell` copy:

| Step | Collects |
|---|---|
| 1. Business | Legal name, registration no., country of registration, VAT/tax ID, website |
| 2. Store | Store name (slug auto-derived + collision check), logo/banner upload (Blob SAS, allowlisted types ≤ 5 MB), description, support email/phone |
| 3. Operations | Supported `regionKey`s (multi-select from enabled Region rows), warehouse region, categories planned, return & shipping policy text |
| 4. Payout & terms | Bank details (captured into new `VendorPayoutAccount`, see §3), payout currency (must be a region currency), accept commission % snapshot + marketplace terms |

Progress is saved per step (`onboardingStep`) so vendors can resume. Submit sets `status=UNDER_REVIEW`, `submittedAt=now()`, fires audit log + confirmation email.

### 2.2 KYC & review

- Documents: business registration + ID of legal representative; uploaded to private Blob container, short-lived SAS for reviewers only; filenames+hashes stored in `kycData`.
- Automated checks on submit: VAT format by country, IBAN checksum, duplicate registration number/store slug.
- **Admin queue** (`apps/admin`): list filtered by status, side-by-side document viewer, approve / reject-with-reason / request-changes. Every action writes `AuditLog`.
- Approval (target SLA matches the promised "two working days"):
  - `status=APPROVED`, user role → `VENDOR`
  - `Storefront` rows auto-created for each supported region (existing `[vendorId, regionKey]` unique holds)
  - revenue share = global default (12% per `/sell` copy) unless overridden later
  - welcome email + in-app notification

### 2.3 First-listing guidance (activation)

Vendors are `APPROVED` but storefront stays unlisted until **first product goes live**: vendor-portal home shows a checklist (payout account ✓ → add product → set stock → publish) driven by simple existence checks. This keeps `/vendors/{slug}` free of empty stores.

### 2.4 States

```
PENDING → UNDER_REVIEW → APPROVED ─────→ ACTIVE (first listing live)
                       ↘ REJECTED (reason, may reapply after edits)
APPROVED → SUSPENDED (admin action, listings hidden, payouts held)
```

## 3. Schema changes (migration)

```prisma
model User {
  // add:
  emailVerified     DateTime?
  twoFactorSecret   String?      // encrypted at rest; TOTP for VENDOR/ADMIN per F1
  twoFactorEnabled  Boolean @default(false)
}

model EmailToken {               // verify / reset / future flows
  id        String   @id @default(cuid())
  userId    String
  type      String   // EMAIL_VERIFY | PASSWORD_RESET
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model VendorProfile {
  // add:
  businessLegalName String?
  registrationNumber String?
  taxId              String?
  countryOfRegistration String?
  warehouseRegionKey  String?
  plannedCategories   String  @default("[]")
  documents           String  @default("[]")   // [{blobKey,name,sha256}]
  submittedAt         DateTime?
  reviewedBy          String?
  reviewedAt          DateTime?
  reviewNotes         String?
  onboardingStep      Int     @default(0)
  acceptedTermsAt     DateTime?
  commissionPctSnapshot Float?
  payoutAccount       VendorPayoutAccount?
}

model VendorPayoutAccount {      // was in PROJECT.md §5, missing from schema
  id                 String @id @default(cuid())
  vendorId           String @unique
  bankName           String
  accountHolder      String
  ibanLast4          String        // full IBAN encrypted to Key Vault, ref stored
  keyVaultRef        String?       // local dev: .env secret ref
  currencyCode       String
  country            String
  createdAt          DateTime @default(now())
}
```

Money stays integer minor units everywhere (payout math included). No `if (region === …)` branches: supported regions, currencies and commission come from config rows.

## 4. API surface (all under `/api/v1`)

| Route | Purpose |
|---|---|
| `PATCH /auth/register` (harden) | Force `role=CUSTOMER` for anonymous callers |
| `POST /auth/verify-email`, `/resend-verification` | Token verify / resend |
| `POST /auth/forgot-password`, `/reset-password` | Reset flow, revokes sessions |
| `POST /auth/2fa/setup` `/verify` `/disable` | TOTP enrollment, vendor/admin enforced |
| `GET/PATCH /vendors/me/onboarding` | Wizard state, per-step validation |
| `POST /vendors/me/documents` | Returns Blob SAS for private upload |
| `POST /vendors/me/submit` | UNDER_REVIEW transition + checks |
| `GET /admin/vendors?status=` , `POST /admin/vendors/:id/(approve\|reject\|request-changes\|suspend)` | Review queue actions (audit-logged) |

Error envelope, zod validation, rate limits on all auth routes (reuse `authLimiter`).

## 5. UI surfaces

- **web**: `/vendor/apply` wizard; verification/reset pages under `/auth/*`; account banners for unverified/blocked states; `/sell` CTAs wired to wizard.
- **vendor-portal**: status-aware shell — `UNDER_REVIEW` shows timeline, `APPROVED` shows activation checklist; Settings → payout account (full IBAN write-once, masked readback).
- **admin**: vendor review queue + document viewer + state transitions; audit trail view.

## 6. Security & compliance notes

- Lock role assignment server-side (fixes current hole); vendor role only ever granted by admin approval path.
- Tokens hashed at rest, single-use, short-lived; constant-time compares.
- Full bank/IBAN + KYC docs: encrypted (Key Vault in prod, `.env`-derived key locally), never logged, SAS reads expire ≤ 15 min.
- 2FA mandatory before first payout for vendors; optional for customers (phase 2).
- All emails sent via **Azure Communication Services Email** (Azure-only policy); HTML rendered from localized i18n templates in `packages/shared`, no third-party providers; Mailpit mirrors SMTP locally in docker compose, console transport in plain dev.

## 7. Phasing (fits existing milestones)

| Phase | Scope | Maps to |
|---|---|---|
| A | Harden register; email verify + password reset; soft gates; region preference card | Milestone 2 |
| B | Vendor apply wizard + schema migration + submit pipeline + admin queue (approve/reject) + storefront auto-provision | Milestone 4 |
| C | 2FA TOTP (vendor/admin), payout account encryption, suspension flows, activation checklist | Milestones 4–7 |

## 8. Decisions (resolved — discretionary calls for v1)

1. **KYC depth**: **manual document review only** at launch (free-tier constraint; no paid identity provider). Provider integration (Stripe Identity/Sumsub) deferred until volume justifies cost.
2. **Guest applications**: **not allowed** — applicants must sign up first. Simpler auth model, no claim-link flows, and the vendor profile needs an owning `User` from day one.
3. **Auto-approval tier**: **none initially**. All applications go through human review; revisit if review queue exceeds ~20/week (then auto-approve low-risk regions with VAT + IBAN checksums passing).
4. **OAuth providers**: **deferred** past Phase A/B. When picked up: Google first (broadest customer reach), Microsoft second (business users applying as vendors).
5. **Commission**: **seeded config row from day one** (`Settings` key `commission.defaultPct = 12` to match `/sell` copy), read server-side — never hardcoded — so per-vendor/per-category overrides land without schema churn later.

These choices favor the Azure free-tier constraint and boring, reversible mechanics; every one is a small follow-up to change later.

