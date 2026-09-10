# Storegrill Enterprise Upgrade — Phase 0 Repository Audit

Baseline: 2026-09-09, branch `enterprise-refactor-session`, HEAD `cc34c15`.
This document supersedes `docs/audit-2026.md` as the working audit against the
current enterprise super-prompt (`PROMPTS/superprompt-enterprise-refactor.md`).
It is read-only — no production code was changed to produce it.

---

## 1. What exists today

### 1.1 Deal engine

**Location:** `packages/shared/src/models/deal.ts`, `packages/shared/src/domain/deal-score.ts`,
`apps/api/src/services/deal-engine.ts`, `services/deal-eval.ts`, `services/deal-pricing.ts`,
`services/deal-valuation.ts`, `routes/deals.ts`, `routes/admin.ts` (deal CRUD), `packages/shared/src/payout-engine.ts`.

**Schema:** `Deal`, `DealVariant`, `Coupon` in `apps/api/prisma/schema.prisma`
(lines 488–548).

**Deal types — engine vs public enum (mismatch):**
- Public/shared `DealType` (`models/deal.ts:4`) and admin create schema: `PERCENTAGE_OFF | FIXED_AMOUNT | BOGO | BUNDLE | FLASH_SALE`.
- Engine-internal `DealTypeEnum` (`services/deal-engine.ts:3-9`) additionally supports `FREE_SHIPPING`, which **cannot be persisted/created** through the API or DB.

**Deal lifecycle (current):** `PROPOSED | LIVE | PAUSED | EXPIRED | REJECTED | ARCHIVED` — approved/rejected/submitted actors tracked. **Does not match** the enterprise lifecycle (`DRAFT/SCHEDULED/UNDER_REVIEW/APPROVED/SOLD_OUT/CANCELLED` missing).

**Deal economics fields:** `merchantDealPriceMinorUnits (BigInt?)`, `rrpMinorUnits (BigInt?)`, `purchaseCap`, `marketingEligible`, `metadata (JSON)` on `Deal`. No separate `DealEconomics` breakdown.

**Pricing formulas (verbatim):**
- `coupon-discount.ts:28-32` — `PERCENTAGE_OFF`/`FLASH_SALE`: `discount = Math.round((subtotalMinorUnits * dealValue) / 100)` capped by `maxDiscount` (float `dealValue`).
- `FIXED_AMOUNT`: `dealValue` treated as major units, converted when different currency.
- `BOGO`/`BUNDLE`: `0` at order level (handled by `deal-engine.ts evaluateDeals`).
- Bonus discount clause: `Math.min(discount, subtotal)`.

**Hard-coded business values found (not yet configured data):**
- Costway markup factors ×1.20 / ×1.10, `DEAL_PROMO_RATE = 25`, flash/category deal windows 48h / 7d (importer + deal promotion logic).
- FragranceX pricing factors 1.7/0.6/1.25/2.2/0.15.
- `services/payouts.ts:65` default `revenueSharePct = 12`, `fixedFeeMinorUnits = 30` when vendor missing.
- `routes/orders.ts:284` hardcoded `weightGrams: 500` per checkout item.
- `ai-merchandising.ts` hardcoded confidence `0.99 | 0.75`.

**Deal score:** deterministic `computeDealScore` (`domain/deal-score.ts`, 6 components) wired through `deal-valuation.ts` and `POST /deals/evaluate`.

**Deal behavior repeatability:** `deal-engine.test.ts`, `deal-valuation.test.ts`, `coupon-discount.test.ts`, `utils/pricing.test.ts` capture current behavior (regression fixtures exist for the main paths).

### 1.2 Commercial logic

**Money convention:** `packages/shared/src/utils/money.ts` is strictly integer minor units (`Money { amountMinorUnits: bigint; currencyCode }`) with basis-point arithmetic (`percentOf`, `toBasisPoints`). **But float `number` leakage exists at the edges:**

| Location | Float leak |
|---|---|
| `routes/orders.ts` checkout (177–297) | `Number(...)` on basePrice, region price, item totals, subtotal, tax, shipping, total |
| `services/payouts.ts:84` + `payout-engine.ts:43` | `Math.round(amount * (revenueSharePct/100))` float percent |
| `coupon-discount.ts:29` | `Math.round((subtotal * dealValue)/100)` |
| `shared/utils/tax.ts:57` | `BigInt(Math.round(Number(taxableAmount) * rule.rate))` float rate |
| Prisma (`Int` on Order/Product/Payment/Refund/Payout) | 32-bit minor units vs `BigInt` on commission/ledger/balance |

**Commission engine — EXISTS (extend, don't replace):**
- `packages/shared/src/domain/commission.ts` — `CommissionRule` (merchantId, regionKey, categoryId, basis, rateBps, min/max commission, effective window, priority), specificity scoring (`merchant +1000, category +100, region +10`), `computeCommission`, `resolveBasisAmount` (DEAL_PRICE / GROSS_ORDER / NET_ORDER / MERCHANT_PAYOUT closed-form / MARGIN), immutable `CommissionSnapshot`.
- `CommissionRule` Prisma model (schema 821–844) with `vendorId`/`startsAt`/`endsAt`/`minAmountMinorUnits` naming.
- `services/commission-rule-mapper.ts` maps Prisma→shared (single source of truth for naming).
- `services/commission-snapshot.ts` — `loadCommissionRules`, `resolveCommissionFromRules`, `snapshotToJson`.
- **Wired at checkout:** `routes/orders.ts:299-327` resolves commission per item per vendor and persists `commissionMinorUnits/commissionRateBps/commissionBasis/commissionSnapshot` on `OrderItem` (immutable snapshot). Admin CRUD at `routes/admin.ts:1041-1094`; previews in `routes/deals.ts /evaluate`, `routes/marketing.ts /commission/preview`.

**Missing commercial concepts:** `VendorCommercialTerms` (only inline `revenueSharePct`/`fixedFeeMinorUnits`), `CommercialAgreement`, `CommissionRuleVersion`, `CommissionCalculation`, `CommercialAdjustment`, `maxRateBps` unused by the shared engine.

**Payouts — EXISTS, partially wired:**
- `services/payouts.ts generatePayouts(period)` — only `DELIVERED` order items, idempotency via existing `payoutLine.orderItemId`; uses order-time `commissionMinorUnits` first, flat `revenueSharePct` fallback for legacy items; creates `Payout(PENDING)` + `PayoutLine[]`; calls `recordPayoutLedger`. Admin-only trigger (`POST /admin/payouts/generate`), no scheduler, no settlement-policy/KYC check.
- `packages/shared/src/payout-engine.ts` is **orphaned/duplicated** — `generatePayouts` re-implements its math inline, and the shared engine is float-based.
- Statuses: `PENDING | PROCESSING | PAID | FAILED | CANCELLED` (enterprise target adds `HELD/ELIGIBLE/REVERSED/ON_HOLD`).
- `PayoutBatch` model missing.

**Ax 'refund/settlement eligibility':** `SettlementPolicy` model + `domain/settlement.ts` state machine exist but are **not invoked** by `generatePayouts`. `VendorBalance`/`VendorBalanceSnapshot` models exist but are **never read/written** — dead for now.

### 1.3 Ledger

**EXISTS and wired** (`services/ledger.ts`, `services/ledger-entries.ts`):
- `recordLedgerTransaction` — double-entry balance enforcement, account auto-provisioning with code-based type inference (`CASH|BANK|RECEIVABLE→ASSET`, `PAYABLE|LIABILITY→LIABILITY`, `REV|FEE→REVENUE`, else EXPENSE), per-entry currency override, requires `currencyCode`.
- `recordOrderSale` (DR CASH / CR SALES_REVENUE + SHIPPING_REVENUE + TAX_PAYABLE) — called from checkout `orders.ts:466` and settlement `markCaptured`.
- `recordOrderRefund` (exact reversal) — called from order cancellation `orders.ts:559`.
- `recordPayoutLedger` (DR COMMISSION_RECEIVABLE / CR COMMISSION_REVENUE; DR MERCHANT_PAYOUT_EXPENSE / CR MERCHANT_PAYOUT_PAYABLE) — called from `generatePayouts`.

**Ledger gaps:**
- Refunds/returns do not reverse the ledger on the returns path or provider refund path (`payment/settlement.ts recordRefund` and `routes/returns.ts` are not ledger-wired).
- **No commission reversal** exists anywhere on refunds/returns.
- Payout ledger writes the payable/commission leg at generation but has **no second leg** when a payout is marked PAID.
- Possible double-ledger risk if an order is CONFIRMED at checkout (`orders.ts:464`) *and* later captured via `markCaptured` — needs a Phase 1 verification test.

### 1.4 Vouchers / coupons / refunds

- **Coupons:** `Coupon` model + `services/coupons.ts validateCoupon` + `services/coupon-discount.ts computeCouponDiscount` (pure) + `coupon-discount.test.ts`. Applied at checkout (single coupon), used at cart preview, `usedCount` incremented.
- **Voucher system (enterprise §13):** **absent** — no `Voucher`/`VoucherRedemption`/`VoucherEvent`, no ISSUED/ACTIVE/PARTIALLY_REDEEMED/REDEEMED/EXPIRED/CANCELLED/REFUNDED/DISPUTED lifecycle.
- **Refunds:** `Refund` model; full order refund on cancellation (with `recordOrderRefund`); provider webhook refunds create `Refund` rows (no ledger); returns flow (`routes/returns.ts`) creates no refunds and touches no money; **no partial refunds**, no refund-engine commercial allocation reversal, no commission reversal.

### 1.5 Deal/cart vs checkout drift

Cart preview runs `evaluateDeals` (deal engine) + coupons; **actual checkout in `routes/orders.ts` applies only a single coupon** — auto-applied deal discounts (e.g. FLASH_SALE) shown in cart may not be charged consistently. No payment/processing fee is computed at checkout (`paymentFeeMinorUnits` exists in engines but checkout total = subtotal + tax + shipping only).

### 1.6 AI platform

**Effectively greenfield:**
- No OpenAI/Azure OpenAI/Anthropic calls, keys, packages, or models anywhere.
- `services/ai-merchandising.ts` is a 32-line deterministic pass-through validator (no AI call), **never called by any route** — dead/stub. Feature flag `AI_MERCHANDISING_ENABLED`.
- Deterministic (non-AI) stubs exist and are reusable: `computeDealScore`, `recommendProducts`, `analyzeMerchantIntelligence` (shared, no HTTP wiring).
- **No** AI Gateway, model router, prompt registry, tool registry, RAG, safety policies, cost controls, AI observability, AIDecision, AI models in schema.
- No feature-flag framework (one env var only). `job-queue.ts` handles imports only; scheduler covers import schedules + tracking poller.
- LibreTranslate (self-hosted NMT) + `TranslationCache` are the only ML-adjacent pieces.

### 1.7 Region, multi-currency, campaigns

- `Region` model + 44 `RegionConfig` seeds — genuinely data-driven (no `if(region===...)` branches). `TaxRule`, `ShippingZone`, `ProductRegionPrice`, `Warehouse` per region.
- Multi-currency: `currency.ts` conversion via Float internally → integer out; hardcoded fallback rates; no persisted `exchangeRate/rateSource/rateTimestamp`.
- Campaigns: `MarketingCampaign`, `MarketingCampaignProduct`, `MarketingEvent`, `MarketingAttribution`, `MarketingParticipation`, `MarketingChannel` exist with CRUD (`routes/marketing-campaigns.ts`, `GET /events`, `POST /events`). Missing `CampaignAudience`, `CampaignCreative`, A/B experimentation, campaign economics.
- Marketing fee: `routes/marketing.ts` `/marketing-fee/preview` + `domain/marketing.ts` fee models exist.

### 1.8 Schema / migrations / tests

- Single Prisma schema, 1073 lines, ~43 models. Migrations dir exists: `20260905000000_init` (all tables incl. enterprise models), `20260908000000_add_category_curation`, `20260909000000_add_listing_indexes`.
- Test suite: ~393 passing (incl. money/commission/ledger/entry/mapper/mail). Missing coverage: `generatePayouts` (payouts.ts has no test), refund/returns money flow, checkout total pipeline, payout PAID second leg.
- `apps/bevesi` exists but is undocumented in `PROJECT.md`.

---

## 2. Gap analysis vs the enterprise super-prompt

Severity: H = blocks the phase, M = required, L = polish.

| # | Gap | Current state | Severity |
|---|---|---|---|
| E1 | **Deal lifecycle** (DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED→SCHEDULED→LIVE→PAUSED→SOLD_OUT→EXPIRED→CANCELLED→REJECTED) | Only PROPOSED/LIVE/PAUSED/EXPIRED/REJECTED/ARCHIVED; no actor-audited transition state machine | H |
| E2 | **Deal types** (TIERED, QUANTITY, REGIONAL, VENDOR, CATEGORY, CAMPAIGN, AI_RECOMMENDED, FREE_SHIPPING as first-class) | 5 types; FREE_SHIPPING engine-only and unpersistable | H |
| E3 | **Deal inventory/allocation** (DealInventory, reserved/sold/released, transactional reservation vs oversell) | Only product stock; no deal-level allocation | H |
| E4 | **Deal economics** as decomposed, versioned model (customer vs marketplace vs vendor) | Inline merchantDealPrice/rrp only; deal-valuation gives a preview | M |
| E5 | **Commercial terms + agreements** (VendorCommercialTerms, CommercialAgreement, effective-dated, versioned, approved) | Inline `revenueSharePct`/`fixedFeeMinorUnits` only | H |
| E6 | **CommissionRuleVersion / CommissionCalculation / CommercialAdjustment** + respect `maxRateBps` | Single active rules + JSON snapshot; no version/calc/adjustment tables | M |
| E7 | **Voucher system** (Voucher, VoucherRedemption, VoucherEvent, idempotent redemption, lifecycle) | Coupon only; no vouchers | H |
| E8 | **Refund engine** (full/partial/item/shipping/deal/voucher; reversed commercial allocations; ledger + commission reversal) | Full-order cancel refund + provider Refund rows; returns don't move money; no partial; no commission reversal | H |
| E9 | **Ledger completeness** (return/provider-refund wiring, payout-PAID leg), **commission reversal** | Ledger wired for sale/cancel/payout-create only | H |
| E10 | **Payout eligibility + batching** (SettlementPolicy applied, KYC, PayoutBatch, payout-PAID ledger, statuses HELD/ELIGIBLE/REVERSED/ON_HOLD) | Admin manual batch on DELIVERED only; PayoutBatch absent; balance models dead | H |
| E11 | **AI Gateway + product/deal/creative/merchandising/copilot/AI governance + AI models + AIDecision** | greenfield (no AI infra) | H |
| E12 | **Price guardrails** (min price, max discount, min margin, price floor) enforced deterministically | Only minOrderAmount/maxDiscount on Deal | M |
| E13 | **Event platform / domain events** | job-queue (imports) only; no domain event abstraction | M |
| E14 | **Feature-flag framework** (global/region/vendor/env/rollout) | One env var | M |
| E15 | **Campaign audience + creative + experimentation (A/B) + campaign economics** | MarketingCampaign/products/events/attribution only | M |
| E16 | **Float money elimination** (checkout, payout, coupon, tax, pricing) + Int→BigInt consolidation | Float `number` leakage at edges; `Int` vs `BigInt` mixed | H |
| E17 | **Exchange-rate persistence** (rateSource/rateTimestamp) for multi-currency | Float conversion, hardcoded fallback, no persistence | M |
| E18 | **Deal Studio / guardrail UX in vendor-portal** (economics, margin warning), **admin commercial dashboards** | vendor-portal has products/payouts/orders/imports only | M |
| E19 | **Background jobs** (deal expiry/activation, voucher expiry, payout eligibility, merchandising recalc) | Imports + tracking poller only | M |
| E20 | **Challenge classification/SEO/embeddings authoritative provenance** ("known limit", not a build item in Phase 0) | Recognized; nothing exists | L |

## 3. Reuse vs build

### 3.1 Reuse unchanged (preserve + wire where needed)

- `packages/shared/src/utils/money.ts` — integer minor-unit money primitives.
- `packages/shared/src/domain/commission.ts` — rule engine, basis resolution, snapshot (extend, don't rewrite).
- `packages/shared/src/domain/deal-score.ts`, `recommendations.ts`, `merchant.ts` trust/velocity, `profitability.ts`, `settlement.ts`, `marketing.ts`, `carrier.ts`.
- `CommissionRule` Prisma model + `commission-rule-mapper.ts` + `commission-snapshot.ts`.
- `services/ledger.ts` + `ledger-entries.ts` (double-entry core) — add missing legs.
- `services/payouts.ts` base, `Deal`/`DealVariant`/`Coupon`, `MarketingCampaign` family, `Refund`, `SettlementPolicy`, `VendorBalance`.
- Existing regression tests (deal/commission/ledger/money/tax/shipping) as the Phase 1 fixture baseline.

### 3.2 Extend in place

- Deal lifecycle + types within the existing `Deal` model and engine enums.
- Order-time `OrderItem.commissionSnapshot` JSON pattern → reuse for new `DealEconomics`/refund snapshots (extend pattern; only add tables where query needs demand it).
- `routes/orders.ts` checkout: run the deal engine (not just coupon), eliminate `Number`, add guardrails — same place, same flow.
- `MarketingCampaign` family → add audience/creative/A-B models rather than new standalone systems.
- `job-queue.ts`/`scheduler.ts` → add deal/voucher/payout jobs behind the existing runner.

### 3.3 Build new (no equivalent exists — confirmed absent)

- Voucher system (§13), DealInventory/DealRestriction/DealRegion/DealSchedule, CommercialAgreement + VendorCommercialTerms + CommissionRuleVersion + CommissionCalculation + CommercialAdjustment, PayoutBatch, refund engine + commission reversal, full AI platform (gateway, models, governance, observability — §19–36), feature-flag framework, domain-event abstraction.

## 4. Hard-coded values to extract to config/data (no code regions)

| Value | Location | Action |
|---|---|---|
| Costway ×1.20/×1.10, DEAL_PROMO_RATE=25, 48h/7d windows | importers/promotion logic | VendorCommercialTerms/PricingRule/DealRule |
| FragranceX 1.7/0.6/1.25/2.2/0.15 | fragrancex importer | importer config/document |
| `revenueSharePct=12`, `fixedFee=30` fallbacks | `services/payouts.ts:65` | commercial terms lookup |
| `weightGrams: 500` at checkout | `routes/orders.ts:284` | catalog/product weight |
| Tax rates as `Float` | `TaxRule.rate` | basis points `Int` |
| confidence 0.99/0.75 stub | `ai-merchandising.ts` | replaced by real AI gateway |

## 5. Schema changes required (Phase 1/2, additive)

- New models: `Voucher`, `VoucherRedemption`, `VoucherEvent`, `DealInventory`, `DealRestriction`, `DealRegion`, `DealSchedule`, `DealEconomics`, `VendorCommercialTerms`, `CommercialAgreement`, `CommissionRuleVersion`, `CommissionCalculation`, `CommercialAdjustment`, `PayoutBatch`, `CampaignAudience`, `CampaignCreative`, `AIRequest`, `AIAsset`, `AIContent`, `AIRecommendation`, `AIExperiment`, `AIExperimentVariant`, `AIDecision`, `AIApproval`, `AIKnowledgeDocument`, `AIEmbedding`, `AIModelConfig`, `AIPromptVersion`, `AIUsageRecord`, `AIAnomaly`, `FeatureFlag` (and per-scope flags).
- Extended: `Deal.status` enum → full lifecycle; `Deal.type` enum → full set; refund-engine fields on `Refund`; payout statuses; `OrderItem` optional refund/commercial reversal references.
- **Migration discipline:** additive only, `prisma migrate diff --from-empty` baseline already present; preserve records; `Int→BigInt` consolidation for financial columns (conversion script, lossless).

## 6. Recommended phase mapping (adjusting the super-prompt order to current state)

1. **Phase 1 — Deals hardening & float-money cleanup** (E2, E16, E1/2 of lifecycle; regression fixtures; extract Costway/payout constants into config).
2. **Phase 2 — Commercial engine formalization** (E5, E6): commercial terms, agreements, rule versioning, calculations, guardrails.
3. **Phase 3 — Vouchers + refund engine + ledger completeness + payouts batching** (E7, E8, E9, E10): voucher lifecycle, commission reversal, payout-PAID leg, settlement policy wiring, balance bookkeeping.
4. **Phase 4 — Vendor Deal Studio + admin commercial dashboards** (E18) on vendor-portal/admin.
5. **Phase 5 — AI Gateway** (E11 backbone) before any AI feature.
6. **Phase 6 — AI product/deal/creative/merchandising/copilots** in dependency order.
7. **Phase 7 — Experiments, analytics, event platform, feature flags, jobs, hardening** (E13, E14, E15, E19).

## 7. Risks

| Risk | Mitigation |
|---|---|
| Checkout/cart deal drift and float math | Phase 1: single integer deal+payments pipeline in `orders.ts`, regression test the totals |
| Ledger double-posting (CONFIRMED at checkout + captured later) | Verify with a test before touching; choose one entry point (capture webhook authority) |
| Big `Int`→`BigInt` migration on live data | Additive + conversion script in the ledger/hardening phase; already lossless (positive minor units) |
| Fiscal correctness of commission reversal | Refund engine must reverse from the order-time snapshot (never today's rules) — reuse `OrderItem.commissionSnapshot` |
| AI cost on free/consumption infra | AI Gateway defaults to cheapest routing + feature flags + caching; no paid service without cost note |
| Existing behavior drift | All current deal/commission/ledger tests become the regression baseline; `npm run test` must stay green per phase |

## 8. Definition of Done for Phase 0

- [x] Existing deal engine mapped (inputs, outputs, entities, formulas, hard-coded values).
- [x] Existing commercial logic mapped (commission, revenue share, markup, tax, shipping, fees, payouts, ledger).
- [x] Voucher/refund/inventory/reservation surfaced.
- [x] AI surface confirmed as greenfield.
- [x] Gaps, duplicates, hard-coded rules, and schema changes catalogued.
- No production code changed (read-only audit).

## 9. Completion Status (as of enterprise-refactor-session)

| Phase | Status | Commit | Description |
|-------|--------|--------|-------------|
| 0 | ✅ | `03f9af5` | Audit doc |
| 1.1 | ✅ | `0380994` | Payout math: integer/bp engine |
| 1.2 | ✅ | `75950c9` | Tax, currency, coupon: integer math |
| 2.1 | ✅ | `c39a1ac` | Commission effective-dated filtering |
| 2.2 | ✅ | `c39a1ac` | Commission guardrails tests |
| 3.1 | ✅ | `2ff5c40` | Ledger: `recordPayoutPaid` |
| 3.2 | ✅ | `bb3f00d` | Voucher, VoucherRedemption, VoucherEvent, PayoutBatch, CampaignAudience, CampaignCreative; Refund engine fields |
| 4 | ✅ | `12f29d9` | Vendor Deal Studio: vendor-scoped CRUD + page |
| 5 | ✅ | `82c219e` | AI Gateway: model config, request logging, route |
| 6 | ✅ | `c730a15` | AI merchandising: gateway-backed async service |
| 7 | ✅ | `8c8f0f5` | Experiments, feature flags, analytics infrastructure |
| 8 | ✅ | `27524b2` | Job queue: retry, backoff, registry |
| 9 | ✅ | `a1262c1` | Scheduler: voucher expiry, analytics aggregation |
| 10 | ✅ | `478e2f6` | Admin dashboard: summary + finance endpoints |
| 11 | ✅ | `7bd282b` | Vendor: RBAC wired to deal CRUD endpoints |