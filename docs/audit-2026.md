# Storegrill Enterprise Audit — 2026

Phase 0 deliverable per the Enterprise Super-Prompt. Baseline captured on
2026-09-05. This document is the starting point for the 12-phase enterprise
implementation; it is expected to be superseded as phases land.

---

## 1. Current architecture assessment

- **Monorepo** (npm workspaces): `packages/shared` (domain models + money/
  tax/shipping/geo engines), `apps/api` (Express REST on `/api/v1`, Prisma +
  SQL, background scheduler), `apps/web` (Next.js 14 storefront), `apps/admin`
  (Next.js 14 admin), `apps/vendor-portal` (Next.js 14 vendor dashboard).
- **Infra**: Terraform, one "pod" per region (38 pods defined; 6 super-pods
  wired to CI: UK, US, EU, AE, NG, GH). Each pod = Container Apps (api, web,
  admin, vendor), Postgres 16, Key Vault, Storage, App Insights, optional
  LibreTranslate/Redis.
- **Data**: single Prisma schema (~40 models), synced via `prisma db push`
  (`AUTO_SCHEMA_SYNC`); no migrations directory. Provider is `postgresql`
  (prod parity via `docker compose up -d db`).
- **Auth**: custom JWT access+refresh cookies, argon2 via bcryptjs, RBAC via a
  `role` string on `User` (`CUSTOMER|VENDOR|ADMIN`), TOTP fields, OAuth
  (Google/LinkedIn/Facebook), email verification via token table.
- **Quality gates**: `typecheck` ✓, `lint` ✓ (0 errors / 23 warnings),
  `build` ✓ (all four apps), `test` 239/240 ✓ (1 failure is environmental:
  the DB-backed import-engine test needs a Postgres `TEST_DATABASE_URL`, but
  the checked-in `.env` points at sqlite `file:./test.db` with a postgres
  provider schema).
- **CI/CD**: 5 GitHub Actions workflows (ci static gates + Terraform
  validate; infra plan/apply; ACA deploys for web / api+web / admin+vendor).

The platform is a working single-region marketplace scaffold, not a toy: full
customer purchase flow, vendor onboarding wizard, CSV/URL import pipeline with
row-level errors, deal/coupon engine, payouts, admin CRUD, analytics, PWA and
SEO. It is **not yet** an enterprise multi-region marketplace.

## 2. Existing functionality inventory

Banked (works end-to-end): auth/registration/verification; product catalog +
PDP + variants + region prices; cart; checkout with server-side tax/shipping/
deal/coupon totals; payment adapters (Stripe, PayPal, COD) + webhooks; order
lifecycle + shipment events + basic tracking; vendor onboarding (4 steps) +
approval; CSV/URL/FTP import pipeline (validate/normalize/dedupe/preview/apply)
with the Aosom, Costway, FragranceX importers; deal + coupon engine (incl.
BOGO/FLASH), waiting-room page, strike-through pricing; reviews; payouts
(period batch, admin lifecycle); region config (45 seeded); search + facets;
SEO (sitemap/robots/OG/JSON-LD); PWA; blog/CMS; newsletter subscribers;
audit log table; admin analytics (funnel, sales by region/vendor/category).

Partially banked: tracking is status-only (no multi-carrier adapters, no
canonical status mapping, no webhook ingestion); shipping is zone-based only
(no merchant-defined rates/rules per deal); refunds are status flips without
financial `Refund` records; money is `Int` minor units in the DB (ok below
~2.1B minor units) with `Float` percentages and `Deal.value Float`;
vendor analytics are absent; no financial ledger; no settlement/payout policy
engine; no disputes/returns workflow; no marketing engine; no commerce
connectors; AI is limited to LibreTranslate content translation; no i18n
`*.json` (web uses a ~30-key TS dictionary; admin/vendor have none).

## 3. Gap analysis (relative to the Enterprise super-prompt)

Severity H = blocks enterprise positioning, M = required for a phase, L = polish.

| # | Gap | Current | Severity |
|---|---|---|---|
| G1 | Financial ledger + immutable events | Payout computation only; refunds/cancels don't write `Refund` rows | H |
| G2 | Region-as-data discipline | Seed/admin write `languages`/`currencies` as raw strings, readers `JSON.parse` → `/currencies`, `/languages` 500 on all seeded regions; warehouse hardcodes `'UK'`; admin analytics hardcodes region→currency | H |
| G3 | Merchant lifecycle + RBAC (roles, granular approvals) | Single `role` string; status string with no lifecycle model; no merchant members | H |
| G4 | Commission & marketing-fee engine (configurable, snapshot-able) | Single `revenueSharePct Float` + `fixedFee`; no rules, no snapshots | H |
| G5 | Settlement policies + trust/risk | Payouts are manual batches only | H |
| G6 | Returns / refunds / disputes / buyer protection | Returns = static page; disputes absent | H |
| G7 | Product vs Deal separation | Product exists; Deal is coupon-ish, no `metadata` column (BUNDLE silently broken), no lifecycle (DRAFT…LIVE), no deal cargo | H |
| G8 | CSV ingestion generality | Fixed-ish column schema; no mapping template model, no async queue | M |
| G9 | Shipping/fulfilment merchant control | Zone carrier strings; no carrier adapter/status map | M |
| G10 | Marketing participation + campaigns + attribution | `includeEmailExposure` only on CSV; no consent model | M |
| G11 | Commerce connectors (WooCommerce first) | None | M |
| G12 | AI merchandising / deal score / recommendations | None (translation only) | M |
| G13 | Audit trail completeness | `AuditLog` table exists but financial writes don't log; admin actions partially | M |
| G14 | Money type discipline | `Int` fields (overflow risk at scale), `Float` rates, `Deal.value Float`, BigInt only in shared `Money` type | M |
| G15 | i18n externalization | Not in `i18n/*.json`; two components use a TS dict | L |
| G16 | OpenAPI docs | None | L |
| G17 | Observability/structured logs/job observability | `console.*`; App Insights wiring partial | L |
| G18 | Unique financial snapshots (commission/marketing fee per transaction) | None | H |

## 4. Target architecture

Preserve the existing stack and layout; **extend, don't replace**:

```
domain boundary            module                    ownership
─────────────────────────  ────────────────────────  ─────────
canonical domains          packages/shared/src/domain/*  pure, deterministic
API                        apps/api/src/routes/*         thin REST wrappers
services/orchestration     apps/api/src/services/*       workflows, jobs
data                       apps/api/prisma/schema.prisma single source of truth
storefront/admin/vendor    apps/{web,admin,vendor-portal}
infra                      infra/terraform (pods)        unchanged topology
```

Non-negotiable rules carried into every phase:

1. Financial truth is deterministic and lives in `packages/shared` pure
   functions (commission, fees, profitability, settlement, trust, deal score).
2. AI never computes financial values, and never invents product facts; source
   data vs AI presentation data stay separate (G7).
3. Money is integer minor units; all new financial columns are `BigInt`
   `amountMinorUnits` + `currencyCode`, and percentage arithmetic is done in
   basis points on integers (G14). Existing `Int` columns migrate to `BigInt`
   (schema) and the client types flow through — no float introduced.
4. Region behaviour is data: a `Region` row (plus `settings` JSON) drives
   currency, tax, shipping, payment methods, marketing availability. No
   hostname/branching (G2).
5. Every financial mutation writes immutable ledger events + audit rows (G1,
   G13, G18).
6. Connectors use adapters behind a `Connector` capability interface (G11).

## 5. Database / domain changes

Created or extended in Phase 1/2 (schema + migration):

- `Deal.metadata`, `Deal.merchantDealPriceMinorUnits`, `Deal.rrpMinorUnits`,
  `Deal.purchaseCap`, `Deal.marketingEligible`, `Deal.status` lifecycle
  re-typed, `Deal.submittedAt/approvedAt/…` (G7).
- `MerchantMember` (vendor RBAC) + merchant lifecycle constants in
  `packages/shared/domain/merchant.ts` (G3).
- `CommissionRule` + engine (basis, min/max, merchant override, effective
  dates, region/category scoping) with per-transaction snapshot (G4, G18).
- `MarketingParticipation` (channel-level consent incl. fee model + budget +
  dates) + price-band fee rules engine (G10).
- `SettlementPolicy`, settlement state machine, `Payout` extended with
  settlement metadata (G5).
- `TrustScore` / `MerchantTrustSnapshot` + trust tiers (G5).
- `LedgerAccount`, `LedgerTransaction`, `LedgerEntry` (immutable double-entry
  style events) driven on payment/refund/settlement (G1, G18).
- `ReturnRequest`, `Dispute`, `DisputeEvidence` (G6).
- `MarketingCampaign`, `MarketingCampaignProduct`, `MarketingChannel`,
  `MarketingEvent`, `MarketingAttribution` (G10).
- `ImportMappingTemplate` (G8).
- `VendorBalance`, `VendorBalanceSnapshot` (G5).
- `Region.settings` JSON + safe string-array parsing helper (G2).

All new financial columns are `BigInt` minor units. Float remains only where it
is not money (ratings, tax `rate` stays as basis points in `Int` going forward).

## 6. Implementation dependency graph

```
P0 audit (this doc)
 → P1 canonical domain + financial foundations (pure engines + tests)
    → P2 schema foundations + migration + API thin wrappers
       → P3 merchant/catalog/ingestion hardening        (needs P2 models)
          → P4 shipping/fulfilment/carrier tracking     (needs P3 shipping model)
             → P5 deals/pricing/profitability            (needs P1 engines)
                → P6 commission/ledger/payment/settlement(needs P1+P5)
                   → P7 returns/refunds/disputes         (needs P6)
                      → P8 AI merchandising + deal score (needs P5, feature flag)
                         → P9 marketing/campaigns/attribution (needs P2 models)
                            → P10 connectors (WooCommerce first)
                               → P11 recommendations + merchant intelligence
                                  → P12 multi-region + QA/security/perf/observability
```

## 7. Migration strategy

- Keep `prisma db push` (AUTO_SCHEMA_SYNC) as the local sync mechanism; add a
  checked-in baseline migration SQL generated by `prisma migrate diff
  --from-empty` so `prisma migrate deploy` in CI builds from zero.
- All additive (new tables/columns) — no destructive drops.
- Column widening `Int → BigInt` on financial columns happens in Phase 6
  (ledger/settlement) with a one-off data conversion script (`BigInt(IntValue)`
  is trivial and lossless since everything is already positive minor units).
- Seed script extended with region `settings` + commission/marketing/settlement
  defaults; existing seed+prod data preserved.
- No production contract renames: new endpoints are
  `/api/v1/vendor/*`, `/api/v1/admin/*`; breaking changes, if any, will be
  versioned and documented.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Monolithic schema growth | Domain-clustered model additions; `packages/shared/domain/*` engines stay IO-free |
| BigInt migration on live data | Phase 6, additive + conversion script, tested against seeded data |
| Feature surface vs quality gates | Every phase ships green (`lint`, `gate:ui`, `typecheck`, `test`, `build`); no stubs committed |
| Test DB dependency | Import-engine integration test skips unless a Postgres URL is provided; CI provides Postgres service |
| Frontend i18n debt | L class; migration to `i18n/*.json` in P12 |
| Local Postgres absent (no Docker) | Schema changes validated via `prisma validate` + `prisma generate`; DB integration exercised in CI |

## 9. Phase plan (with Definition of Done)

Executed in dependency order; each phase lands with schema (if any),
migration, domain logic, API, permissions, audit, background jobs (if any),
tests, observability hooks, and docs updated.

1. **P1 Canonical domain + financial foundations** — `domain/{merchant,
   commission, marketing, profitability, settlement, trust, deal-score}.ts`
   plus bigint-safe money helpers; vitest coverage; exported from `shared`. ✅ DONE
2. **P2 Schema + API foundations** — ✅ DONE: models in `schema.prisma`,
   baseline migration SQL (`prisma/migrations/20260905000000_init`,
   `migrate diff --from-empty`), `prisma generate`, thin REST wrappers
   (`/api/v1/vendor/marketing/{participation,channels}`,
   `/api/v1/vendor/marketing/marketing-fee/preview`,
   `/api/v1/vendor/marketing/commission/preview`, `/api/v1/admin/commissions`),
   plus §3 bug fixes (region routes, CheckoutSchema split, cancel → txn +
   Refund row, webhook refund rows via `recordRefund`, warehouse regionKey,
   admin analytics region currencies, import-engine Postgres skip-guard).
   BigInt columns are `Number()`-converted at JSON boundaries.
3. **P3 Merchant/catalog/ingestion** — ✅ DONE: `services/merchant-lifecycle.ts`
   (legacy → canonical status adapter delegating to the pure engine; approve =
   composite pass through the VERIFIED/KYC gate; KYC decision guard; fixed the
   engine's overly strict KYC gate on entering `UNDER_REVIEW` and added the
   `UNDER_REVIEW → REJECTED` review-veto edge), enforced in admin
   `PUT /vendors/:id/status`, `POST /vendors/:id/approve|reject`;
   `services/merchant-rbac.ts` (`resolveMerchantContext` = ACTIVE
   `MerchantMember` → else vendor owner; `requireMerchantPermission` middleware
   with role + explicit permission overrides) wired into `routes/marketing.ts`,
   merchant member CRUD in `routes/admin.ts` (`/api/v1/admin/members`);
   `ImportMappingTemplate` CRUD in `routes/imports.ts`
   (`/api/v1/vendor/imports/templates`, vendor-scoped + global defaults);
   async job queue framing `services/job-queue.ts` (`executeJob` pure runner /
   lifecycle, `queueImportJob` swallows surprises into a FAILED status) used by
   the import routes.
4. **P4 Shipping/fulfilment/carriers** — carrier adapter interface, canonical
   status enum + mapper, webhook + polling ingestion, tracking UX.
5. **P5 Deals/profitability** — deal lifecycle, deal cargo, profitability
   engine surfaced in vendor deal creation UX, deal score v1.
6. **P6 Commission/ledger/settlement** — commission + marketing fee snapshots
   on orders; ledger events; settlement policies; payouts; trust gates.
7. **P7 Returns/disputes/buyer protection** — workflows + admin/vendor UX.
8. **P8 AI merchandising** — grounded AI analysis service (title/desc rewrite
   validated against source facts), feature-flagged.
9. **P9 Marketing/campaigns/attribution** — campaign marketplace, email
   engine adapter hooks, attribution model.
10. **P10 Connectors** — `Connector` capability interface + WooCommerce
    connector (import/sync/webhooks/idempotency).
11. **P11 Recommendations + merchant intelligence.**
12. **P12 Hardening** — i18n JSON, OpenAPI, observability, security pass,
    performance, final E2E.

Each milestone ends with quality gates green and `docs/` updated.