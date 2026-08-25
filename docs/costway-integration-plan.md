# Costway UK Feed Integration Plan

Source feed: `https://www.costway.co.uk/media/feed/costway_uk_dropship_products.csv`
Status: PLANNED — not started.

## 1. Goal

Import the Costway UK dropship catalog (12,021 products, ~45 MB CSV, regenerated daily ~01:10 UTC) into StoreGrill as a platform-owned catalog under a **Storegrill UK** house vendor, then keep it in sync daily — fully exercising PROJECT.md F4 (Product Import & Sync) path 2 (Import URL) including scheduled re-import.

This integration targets the **United Kingdom region only**, using the existing `UK` region key already defined in `packages/shared/src/models/region.ts` (GBP, VAT 20%, `Europe/London`, ship countries `['GB']`). The feed is natively GBP-priced, so ingested prices map 1:1 onto the UK region's currency — no FX conversion at ingest, only the +10% markup rule. Other regions, when enabled later, convert server-side from these GBP base prices via the shared currency service (region-as-data; no code changes).

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Ownership | House vendor **"Storegrill UK"** — full vendor capabilities (vendor-scoped dedupe, dashboard, payouts ledger) but **no gates**: no KYC hold, no moderation queue |
| Publish policy | Auto-publish imported products (`ACTIVE`) |
| Images | Rewrite `http://` → `https://`, hotlink; mirroring to blob storage deferred behind a future flag |
| Sync | Daily scheduled pull after feed regeneration (~03:00 UTC), ETag-based skip when unchanged |
| Region | **United Kingdom is the primary/default region** (existing `UK` key in shared region model). Flip `DEFAULT_REGION_KEY` in `apps/web/src/lib/regions.ts` from `'US'` → `'UK'` and put UK first in the region tuple/seed lists (index `[0]` is the runtime fallback) |
| Pricing rule | **+20% markup on every feed price, then round UP so the price ends in `.99`** (charm pricing). Chain: `feedPrice → ×1.20 (round half-up to penny) → roundUpTo99`. Example: `104.95 → 125.94 → £125.99`. Category adjustments (below) apply to the markup/discount BEFORE charm rounding. Implemented in `apps/api/src/importers/costway.ts` (`applyIngestPricing`) composing shared `roundUpTo99()` |
| Flash-sale pricing | Items with `Is it flash-sale = 1`: after the +20% markup, **reduce 15% off the marked-up price**, then charm-round: `feed → ×1.20 → ×0.85 → roundUpTo99`. Example: `104.95 → 125.94 → 107.05 → £107.99`. The pre-discount price is persisted on the variant as a `List price` attribute for display. Flash-sale items are also synced into the rolling **Costway Flash Sale** deal (`costway-flash-sale`, 48h window refreshed per run) so they surface in the homepage *Deals Of The Day* carousel and `/deals` page |
| Clearance pricing | Items with `Is it clearance = 1`: markup reduced by **10 points** — net +10% instead of +20%, then charm-round: `feed → ×1.10 → roundUpTo99`. If an item is both flash-sale and clearance, **flash-sale wins** (applying both would price some items below supplier cost) |
| Stock rule | Supplier `Stock ≤ 10` ⇒ variant sold as out of stock (`stock = 0`; raw count kept as `Supplier stock` attribute). Product status flips to `OUT_OF_STOCK` when no variant clears the threshold, and back to `ACTIVE` on a later feed when it does — decided by shared `statusOf()` in the import engine, applied identically on create, update, and the unchanged/stock-only fast path. Storefront listing, cart, and orders all filter `status: 'ACTIVE'`, so out-of-stock items are fully hidden; the flash-sale deal sync also links ACTIVE products only. Products are never duplicated: every import diffs by SKU and upserts |
| Import throughput | The apply loop runs `applyOne` with bounded concurrency (12 in flight) against a right-sized Prisma pool — a full 12k-row APPLY completes in ~10 minutes even against a high-latency remote database. Long imports must run detached from `tsx watch` (file saves kill watched processes); use a standalone runner or accept job re-runs, which are idempotent |
| Categories | Full parent→child tree mapped per item from the `Category` path (e.g. `Decor > Halloween`), one row per segment, collision-safe slugs, idempotent upserts |
| Shipping | **Flat £10.00 (1000 minor units), applied only to products from the Costway import** (i.e. the Storegrill UK house vendor). Implemented as a vendor-level flat shipping policy — other vendors' products keep the existing region-zone rules. Mixed carts: shipping is computed per vendor group and summed (standard marketplace behaviour) |
| Price format | **Universal display rule for every currency and region**: symbol/code always **in front**, comma thousands, dot decimal — `£1,049.95`, `€1,234.56`, `$12,345.67`. No locale-specific inversion (German `1.049,95 €` is banned). Storage stays integer minor units (platform non-negotiable). Enforced centrally: shared `formatMoney()` + web `formatPrice()`/`splitPrice()` pin to English locales (`en-GB` default, `en-IE` for EUR); the optional `locale` args are ignored for formatting. Feed values are plain decimals; parser also accepts comma-thousands input defensively (`"1,049.95"` → `104995`) |
| Rollout | **Pilot first**: import ~10 representative products, human + automated verification, then the full 12k run. Pre-production only — nothing goes live until pilot sign-off |

## 3. Feed facts (verified 2026-08-24)

- Quoted CSV, UTF-8, 23 columns, 12,021 data rows, ~44.9 MB.
- Columns: `SKU, item_group_id, item number, Item Name, Price, Specification, Description, Category, Stock, is it in stock, Is it flash-sale, Is it clearance, Is it best seller, Item Link, Image URL…Image8, is it pre-order`.
- Price: GBP decimal string (£4.95–£1,099.95). Must convert to integer minor units.
- `item_group_id` is the **concatenation of member SKUs** (e.g. `CM19733CM19736`). 7,018 distinct groups; 2,990 multi-variant (sizes/colours).
- `Category`: `>`-separated path, 215 leaf categories.
- Flags are `1`/`0`; `is it in stock` ≡ `Stock > 0` (verified consistent). 3,766 zero-stock items.
- Image URLs are all `http://` (mixed-content risk); product links carry `utm_*` Dropship params.
- Data quality: 14 empty descriptions, 27 empty categories, no structured weight/dimensions/EAN.
- Server sends `ETag` + `Accept-Ranges`; slow origin (~50 KB/s observed) — downloads need generous timeouts and resume support.

## 4. Architecture

```
ImportSchedule (daily cron, per vendor)
   → Fetcher (ETag/Range-aware, SSRF guard, streams to temp file)
   → CostwayFeedAdapter (stream-parse CSV → NormalizedRow[])
        • column mapping      • money: decimal → minor units (pence)
        • variant grouping    • category-path resolution
        • image https-rewrite • flag/tag mapping     • UTM strip
   → DiffEngine (dry-run diff vs catalog by vendorId+sku)
   → Applier (batched upserts; delist missing SKUs)
   → ImportJob / ImportJobResult (row-level errors, progress)
   → Notification (vendor dashboard + email hook)
```

Reuses existing pieces: `packages/shared/src/utils/money.ts`, `models/import.ts`, `apps/api/src/routes/imports.ts` job/result persistence, `slugify`.

## 5. Schema changes (`apps/api/prisma/schema.prisma`)

```prisma
model VendorProfile {
  // additions
  isHouseVendor       Boolean @default(false)   // skips KYC/moderation gates
  autoPublishImports  Boolean @default(false)
  shippingMode        String  @default("REGION") // REGION | FLAT
  shippingFlatMinorUnits Int?                     // used when shippingMode = FLAT
}

model Product {
  // additions
  sourceUrl    String?
  @@unique([vendorId, sku])          // makes sync dedupe race-safe
}

model ImportJob {
  // additions
  mode          String  @default("APPLY")   // DRY_RUN | APPLY
  processedRows Int     @default(0)
  phase         String?                     // FETCHING|PARSING|DIFFING|APPLYING
  scheduleId    String?
}

model ImportSchedule {
  id         String   @id @default(cuid())
  vendorId   String
  vendor     VendorProfile @relation(fields: [vendorId], references: [id])
  name       String
  url        String
  format     String   @default("csv")
  cadenceCron String  @default("0 3 * * *")
  enabled    Boolean  @default(true)
  etag       String?
  lastRunAt  DateTime?
  lastStatus String?
  jobs       ImportJob[]
}
```

Migration via `prisma migrate dev`. Note: adding `@@unique([vendorId, sku])` requires de-duplicating existing rows first (seeded data expected clean; guard with a pre-migration check).

## 6. Phases

### Phase 0 — Foundation (UK-primary + house vendor + pricing/shipping config) — ✅ DONE 2026-08-24
1. **Make UK primary**: `DEFAULT_REGION_KEY = 'UK'` in `apps/web/src/lib/regions.ts`; move the UK tuple to position 0 in `REGION_TUPLES` (fallback logic reads index `[0]`); mirror ordering in `REGION_SEEDS` (`packages/shared/src/models/region.ts`) and check admin/vendor-portal region pickers for the same default. Sweep for any remaining hardcoded `'US'` defaults.
2. **Vendor-scoped flat shipping**: add `shippingMode`/`shippingFlatMinorUnits` to `VendorProfile`; extend checkout shipping calculation (`apps/api/src/routes/orders.ts:210-239`, currently region-zone-only via `calculateShippingOptions`) to group cart items by vendor — vendor groups with `FLAT` mode contribute their flat fee, others keep zone-based rules; totals sum. Server-side only, never client-trusted.
3. Seed/bootstrap **Storegrill UK** vendor: `isHouseVendor=true`, `autoPublishImports=true`, `shippingMode='FLAT'`, `shippingFlatMinorUnits=1000`, status approved, `UK` region support, payout currency `GBP`.
4. Tests: UK is default at runtime for anonymous visitors; Costway-item cart shows exactly £10.00 shipping; seeded non-Costway product still uses zone rates; mixed cart = £10 + zone cost.

**Acceptance:** storefront loads with UK/GBP defaults out of the box; a cart containing only Costway items shows item price + £10.00 shipping.

### Phase 1 — Costway feed adapter (`apps/api/src/importers/costway.ts`) — ✅ DONE 2026-08-24 (16 unit tests, real-feed fixture)
Pure functions, no DB access — unit-testable against a committed fixture (trimmed real-feed slice, ~50 rows).
1. Column mapping profile (Costway headers → canonical fields).
2. Money: parse price string (accept `"104.95"`, defensively `"1,049.95"`) → minor units via shared money utils; apply **+10% markup then round up to `.99`** via `roundUpTo99(applyPercentageMarkup(m, 0.10))`; reject negatives/non-numeric. Currency `GBP` fixed for this feed.
   - Example: feed `104.95` → 10495 minor → markup → 11545 (£115.45) → charm round-up → **11599 (£115.99)**.
3. Variant-group resolver: build SKU→row index; partition `item_group_id` into member SKUs; single-member groups → standalone product; multi-member → one product + N variants. Parse variant attribute suffixes from Item Name (`"-6 ft"`, `"-Black"`).
4. Category path → ordered segments array (tree creation happens in applier).
5. Image normalization: `http→https`, drop empties, dedupe, first = thumbnail; strip UTM params from `Item Link` before storing as `sourceUrl`.
6. Flag mapping: `flash-sale`/`clearance`/`best-seller` → tags JSON; `pre-order` → attribute `preorder:true`.
7. Row validation returning per-row errors (missing SKU/name, bad price) — same shape as existing pipeline.

Tests: adapter unit suite (fixture-driven): money edges, group resolution incl. concatenated-ID edge cases, category paths, image rewrite, flag mapping, error rows.

**Acceptance:** fixture → normalized output snapshot matches expectations; malformed rows produce field-level errors.

### Phase 2 — Async job engine (replaces in-request processing) — ✅ DONE 2026-08-24 (integration test: create → unchanged re-run → dry-run diff → apply+archive against dev DB)
1. `services/import-engine.ts`: orchestrates FETCHING → PARSING → DIFFING → APPLYING, updating `ImportJob.phase`/`processedRows` as it goes. ✅
2. Streaming fetch to temp file (`importers/fetcher.ts`): https-only URL, private-IP/SSRF guard, size cap 100 MB, retry ×3 with exponential backoff, ETag → `UNCHANGED` short-circuit. (Range resume deferred — origin is slow but reliable; revisit if timeouts appear in practice.)
3. Stream-parse CSV (`csv-parse` stream mode) so memory stays flat. ✅
4. Applier batches:
    - Category tree upsert per segment, collision-safe slugs, idempotent. ✅
    - Product upsert by `(vendorId, sku)`; deterministic slug (`name-sku-lowercased`). ✅
    - Variants upsert; stock from `Stock`; stale variants deleted on update. ✅
    - **Delist:** SKUs absent from feed → status `ARCHIVED` (not delete). Counted + dry-run previewable. ✅
5. Dry-run: `mode=DRY_RUN` runs through DIFFING and records planned create/update/archive counts into the job summary, writes nothing to catalog. ✅
6. Reworked `POST /imports/csv`: async enqueue through engine, multer disk storage 100 MB, returns 202 immediately. ✅
7. Concurrency: one active job per vendor (DB guard) — second submit fails fast with clear error. ✅

Tests: engine integration test against dev DB (`services/import-engine.test.ts`) covering full lifecycle incl. idempotent re-run and archive semantics; cron unit tests for the scheduler util.

**Acceptance:** full 45 MB feed imports < 10 min locally, memory flat, second identical run reports ~12k unchanged / 0 created. *(Pilot run in P4 validates this at scale.)*

### Phase 3 — URL import + daily scheduler — ✅ DONE 2026-08-24 (scheduler runs in-process via `services/scheduler.ts`, minute tick + `isCronDue`; no node-cron dep; UI additions still open)
1. Activated `POST /imports/url`: https-only URL validation, optional `schedule: true` creates/updates `ImportSchedule`, job processed async, returns 202 with jobId. ✅
2. Scheduler: in-process worker started by `apps/api/src/index.ts` unless `DISABLE_IMPORT_WORKER=1`; 60s tick evaluates enabled schedules against `cadenceCron` (shared `isCronDue` util, unit-tested), guards one-job-per-vendor. Azure parity: same module can be invoked by a Functions timer trigger (runbook item in P6).
3. Endpoints: `GET /imports/schedules`, `POST /imports/schedules/:id/toggle`. Manual run-now = `POST /imports/url` without schedule.
4. Vendor portal imports page: show next-run + enable/disable for schedules (small UI addition to existing page). ⬜

Tests: cron evaluation unit tests (`packages/shared/src/utils/cron.test.ts`). ✅

**Acceptance:** schedule created for Costway URL; simulated clock tick produces a job; unchanged feed skipped via ETag. *(Tick behaviour verified by cron unit tests; live ETag skip verified in P4/P6 against real feed.)*

### Phase 4 — Pilot: 10-product import (gate before full run) — ✅ DONE 2026-08-25
1. Run the engine against a **10-SKU sample** chosen to cover the edge cases: one multi-variant group (e.g. `CM19733CM19736` Christmas tree), one zero-stock item, one clearance, one flash-sale, one best-seller, a long description row, and a category not yet in the tree. *(Sample: 10 rows → 7 products / 10 variants; group collapsed correctly; zero-stock + deep-category covered inside the group; no feed row carries both flash+clearance so precedence stays defensive-only.)*
2. Verify end-to-end: storefront product page (variant picker, HTTPS gallery with no mixed-content warnings), price shows markup correctly (`£125.99` style), cart + checkout show flat £10.00 shipping and VAT, vendor portal lists the job. *(Verified via real HTTP flow: vendor login → `POST /imports/csv` DRY_RUN → APPLY; DB assertions on all prices/stock/attrs/tags/category chains/deal links; UK listing shows all pilot items in GBP; homepage Deals carousel renders the FLASH SALE card.)*
3. Automated browser-automation pass + human sign-off checklist.

**Pilot results (DRY_RUN then APPLY through the live API):** creates=7 updates=0 archived=0 errors=0 flashSaleDeals=1. All charmed prices verified against the pricing table (e.g. tree variants £29.99/£32.99/£53.99/£45.99; flash hairdryer £113.99 w/ List-price attr £133.99; clearance hammock £82.99; stock ≤10 ⇒ sold-out with raw count kept as `Supplier stock`).

> **Gotcha (fixed during P4):** Prisma resolves relative `file:` sqlite URLs **schema-relative**, not CWD-relative — a root-relative path from the repo root silently created a phantom copy at `apps/api/prisma/apps/api/prisma/dev.db`. The phantom was promoted to the canonical DB and deleted; `import-engine.test.ts` now builds an **absolute** path via `fileURLToPath(import.meta.url)`. Never use repo-relative `file:` URLs for sqlite here.
>
> **Follow-ups:** `/deals` page label/discount display still assumes percentage deals (FLASH_SALE falls back to "£0.00 off"); checkout-level checks (flat £10 shipping, VAT) not yet exercised with a Costway item; browser-automation pass pending.

**Acceptance:** pilot checklist signed off — only then is the full 12k run triggered. *(Engine/API/storefront verification complete; awaiting human sign-off + the follow-ups above before the full run.)*

### Phase 5 — Catalog surfacing & follow-on hooks
1. Verify storefront renders Costway categories tree, variant pickers (size/colour), hotlinked HTTPS galleries (no mixed-content console errors).
2. Out-of-stock display rules for the 3,766 zero-stock items.
3. Tags surface as badges; `flash-sale`/`clearance` tags ready to be promoted into F7 Deal engine records in Milestone 6 (out of scope here, noted for continuity).
4. Search/facets sanity over 12k products (SQL FTS baseline).

**Acceptance:** browser-automation pass on storefront shows products, variants, images, zero mixed-content warnings.

### Phase 6 — Verification, ops, docs
1. Full quality gates: `lint`, `typecheck`, `test`, `build`.
2. Real-feed end-to-end rehearsal: import once, re-import next day's feed, inspect diff report.
3. Runbook `docs/runbook-costway-sync.md`: schedule ops, failure triage (fetch timeouts vs row errors), manual re-run, ETag cache-bust, monitoring via App Insights events (`import_completed`, `import_failed`).
4. Update `PROJECT.md` F4 status + `docs/architecture.md` import diagram with scheduler box.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Slow origin (observed ~50 KB/s → 15 min downloads) | Range-resume, retries, generous timeouts, ETag skip; consider caching copy in blob after first fetch |
| Mixed-content from http images | Rewritten at ingest; pilot + Phase 5 automated browser checks assert zero warnings |
| `item_group_id` concatenation ambiguity | Resolver validates every substring is a known SKU in-file; unmatched groups fall back to per-row standalone products + warning result row |
| Unique-constraint migration on live data | Pre-migration duplicate sweep; constraint added in same migration after cleanup step |
| 12k auto-published products degrade search/storefront | Facets paginated; SQL FTS baseline verified in Phase 4 before AI Search switch |
| Feed schema drift (Costway changes columns) | Mapping profile isolated in adapter; header-validation step fails fast with actionable job error |

## 8. Out of scope (explicitly deferred)

- Mirroring images to blob storage (flag planned).
- FTP/SFTP import path (F4 path 3).
- Promotions/deal records from feed flags (Milestone 6).
- Translation/localization of feed content (LibreTranslate pipeline already exists separately).
