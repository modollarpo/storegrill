# STOREGRILL — Multi-Region Marketplace & Multi-Vendor Commerce Platform

**Domain:** https://storegrill.net
**Status:** Scaffold — Milestone 1 not yet started
**Principles:** Azure free-tier first · Region-as-data · Money as integer minor units · Quality gates before Done

---

## 1. Non-Negotiable Principles

- Everything must fit inside Azure **free / consumption** offerings (map in §4). Justify any paid resource; if required, mark it with an estimated monthly cost and a free alternative.
- Code quality: linting, formatting, unit + integration tests, and CI must pass before any "Done" is claimed.
- No secrets in code or committed files — use Azure Key Vault (free).
- Every feature must work in at least 2 regions with **zero code changes** (region is data, not code).
- Monorepo layout:
  - `apps/api` — REST API (Azure Functions or App Service)
  - `apps/web` — customer storefront (SSR/SPA)
  - `apps/admin` — admin backend
  - `apps/vendor-portal` — vendor dashboard
  - `packages/shared` — domain models, money/tax/shipping/deal engine, i18n
  - `infra/` — Bicep infrastructure
  - `docs/` — architecture, data model, runbooks
- Use **TypeScript** end-to-end unless a component fundamentally requires otherwise.

## 2. Multi-Region Model (core domain concept)

Each region is a first-class entity:

- `regionKey` (e.g. `US`, `EU`, `IN`, `AE`), `name`, `languages[]`, `defaultLanguage`, `currencies[]` + `defaultCurrency`, `defaultTimezone`, `taxRules[]`, `regionsConnected` (cross-region shipping).
- Money: store as `{ amountMinorUnits: bigint, currencyCode: string }`. **Never float.** Server-side conversion service with seeded free rates + manual override.
- i18n: `i18n/*.json` per language; all UI strings externalized; dates/numbers via `Intl`.
- Pricing per region: `price = basePrice * regionalMultiplier` + per-region taxes/discounts.

## 3. Feature Set (all required)

### F1. Auth & Identity
Customer, Vendor, Admin roles. JWT access + refresh tokens; argon2/bcrypt hashing. Email verification, password reset, 2FA (TOTP) for vendors/admins. Profile stores `preferredRegion`, `defaultShippingAddress`, `currency`, `language`.

### F2. Catalog & Search
Products with variants (SKU, attributes, images, per-region price, per-region warehouse stock). Categories & brands. Faceted search (category, price, brand, rating). Full-text search + typo tolerance (Azure AI Search free tier OR SQL FTS fallback). SEO: slug URLs, per-region sitemaps, OpenGraph, canonical, Product JSON-LD.

### F3. Multi-Vendor Marketplace
Vendor onboarding (KYC, payout/bank details, region support, return policy). Vendor storefronts (`/vendors/{slug}`), vendor ratings, vendor-managed inventory. Revenue share: global default % + per-vendor override + per-category override. Vendor dashboard: orders, payout ledger (pending/processing/paid), listings, analytics.

### F4. Product Import & Sync (critical feature)
Vendors add/update products 4 ways:
1. **CSV upload** — web upload, template download, column mapping, row-level error report.
2. **Import URL** — HTTP/HTTPS feed (JSON/CSV), scheduled re-import, webhook support.
3. **FTP/SFTP** — watcher folder or scheduled pull; credentials encrypted in Key Vault.
4. **Manual entry** — admin/vendor UI.

Pipeline: validate → normalize → dedupe (SKU + vendor) → preview → staged import (dry-run diff) → apply → notify (email + in-app). Bulk images via URL import.

### F5. Cart, Checkout & Payment
Per-region cart (currency, tax, shipping computed **server-side**; never trust client totals). Payments: Stripe (test keys), PayPal/Braintree, COD where eligible. Tokenize cards; never store PANs. Order states: pending → confirmed → paid → processing → shipped → delivered / cancelled / refunded. Inventory reservation + stock decrement; backorder / split-shipment.

### F6. Shipping
Shipping zones per region; weight + price-based rules; carrier adapters (FedEx/DHL/Aramex stubs) + carrier estimates. Cross-region flag with lead time + import-duty notice. Tracking numbers, shipment events, delivery confirmation. Free-shipping thresholds per region.

### F7. Deals & Promotions
Global + region-specific: percentage, fixed amount, BOGO, bundle, flash sale (timer), coupons (single-use, category-restricted, stackable rules). Deal engine enforces: vendor opt-in, revenue-share impact, min/max per customer, stock caps, price floors. "Deals of the Day" + "Trending Deals" per region.

### F8. Reviews & Ratings
Purchase-verified only; rating breakdown; photo reviews (Blob storage); vendor responses; moderation queue (auto + admin).

### F9. Notifications
Email via Azure Communication Services Email (pay-as-you-go, Azure-only stack): order confirmations, shipping, deals, import results, payouts. In-app notification center. Templates localized per region.

### F10. Admin Backend
Users, vendor approval, product moderation, deals, coupons, orders, payouts, regions CRUD (currency/language/tax/zone), import jobs, content pages, settings. Audit log for admin/vendor destructive actions.

### F11. Analytics (lightweight)
Sales by region/vendor/category, top products, conversion funnel, import success/failure stats. `--seed` command with sample dataset (200+ products, 5 vendors, 3 regions).

## 4. Azure Free-Tier Architecture

| Concern | Azure free service | Notes |
|---|---|---|
| Global routing | Azure Front Door (Standard) | Region → nearest origin; flag `deployFrontDoor` in Bicep (Front Door is the one paid-ish item — triable, document cost) |
| Web + API | App Service (F1 Free) + Functions (Consumption) | Within free quotas |
| Data | Azure SQL Database (Free tier) | One free DB per subscription |
| Object storage | Blob Storage (free 5 GB) | Private containers + short-lived SAS URLs |
| Cache | Redis (Basic) — flag `deployRedis` | Not free; optional; document cost or use in-memory fallback |
| Search | Azure AI Search (free tier) | Fallback to SQL FTS |
| Auth | Custom JWT | Document AAD B2C alternative |
| Secrets | Key Vault (free) | FTP creds, Stripe, ACS keys, JWT secret |
| Email | Azure Communication Services Email ($0.00025/email ≈ $2.50/mo at 10k sends; requires custom verified domain for useful quotas) | Transactional only; Azure-only stack — no third-party providers |
| Monitoring | Application Insights (free 5 GB) | Logging, traces, custom metrics |
| CI/CD | GitHub Actions (free) | Build → test → deploy Bicep |

`infra/terraform` deploys the full stack idempotently (region-pod architecture, one pod per country). See `docs/architecture.md` and `infra/README.md`.

## 5. Data Model (SQL-first)

Entities: `Region, Locale, CurrencyRate, User, CustomerProfile, VendorProfile, VendorPayoutAccount, Storefront, Product, ProductVariant, VariantImage, Category, Brand, Warehouse, InventoryLedger, Price, ProductRegionAvailability, ImportJob, ImportJobResult, ImportMappingTemplate, Deal, DealVariant, Coupon, Cart, CartItem, Order, OrderItem, Shipment, ShipmentEvent, Payment, Refund, Review, ReviewModeration, Payout, PayoutLine, Notification, AuditLog, SearchSynonym, ContentPage, SiteSetting, BlogCategory, BlogTag, BlogPost, BlogPostTag`.

ERD in `docs/data-model.md`.

## 6. API & SDK Conventions

- REST under `/api/v1`, OpenAPI spec (`swagger-ui`), idempotency keys on payment/order endpoints.
- Error envelope: `{ error: { code, message, fields? } }`.
- Versioned endpoints; webhook signature validation for vendor import URLs.

## 7. Security

OWASP Top-10: input validation (zod), parameterized SQL, rate limiting, CORS allowlist, CSRF, helmet. File uploads: content-type/size/extension allowlist (+ Virus Total scan via GitHub Action). Vendor FTP/SFTP creds encrypted in Key Vault; never logged.

## 8. Testing & Quality Gates

- Unit: money/currency math, tax, shipping rules, deal engine, import parser (CSV/JSON edge cases).
- Integration: checkout flow, import pipeline (test DB).
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` must all pass.
- E2E smoke (Playwright): customer purchase + vendor import happy path.

## 9. Milestones (checkpoints, in order)

1. Scaffold monorepo, CI, lint/typecheck, Bicep baseline, seed command, README.
2. Auth + regions + catalog + per-region pricing + basic storefront UI.
3. Cart/checkout/payments/shipping + order lifecycle.
4. Vendor portal + storefronts + reviews.
5. Import engine (CSV → URL → FTP) + dashboard + notifications.
6. Deals/coupons + search/facets + SEO.
7. Admin backend + moderation + payouts + analytics.
8. Multi-region polish, E2E, security pass, docs, deploy to storegrill.net.

## 10. Definition of Done

- F1–F11 implemented and demonstrated by tests or runnable demos.
- Multi-region demo: switch region at runtime → currency, language, tax, shipping, deals, search all change correctly.
- Import demo: vendor imports 50 products via CSV and 10 via URL feed successfully.
- CI/GitHub Actions deploys the full stack to Azure free tier; app loads at storegrill.net.
- README + `docs/` complete (setup, seeding, architecture, service map, cost note, troubleshooting).
- No secrets committed; Key Vault used; lint/typecheck/tests pass in CI.

## 11. Constraints

- No paid Azure services without flagging cost + free alternative.
- Boring, maintainable stack; battle-tested libs over novelty.
- Local dev runs with zero required containers: the API uses SQLite (`apps/api/prisma/dev.db`) and LibreTranslate degrades gracefully when absent (content falls back to source language; curated UI strings stay translated). Optional containers (`docker compose up -d translate db mail`) add Postgres/MinIO/Mailpit/LibreTranslate for production parity.
