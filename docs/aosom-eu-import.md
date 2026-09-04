# Aosom Feed Import (EU + UK)

Aosom supplies our EU home & garden catalog via a public HTTPS tab-delimited dropship feed and our
**UK pod** via a two-feed S3 pod that must be **merged on SKU** before import. This runbook covers both
formats, the adapters, pricing, thresholds, and how to run/register them.

There are two adapters:

| Adapter | Source | Region | Currency | Pricing |
| --- | --- | --- | --- | --- |
| `aosom.ts` | single-file EU feed | EU | EUR | Special Price, badge-only 20% Compare-at |
| `aosom-uk.ts` | **two-feed UK pod** merged on SKU | UK | GBP | wholesale (`2B-S`), badge-only 20% Compare-at |

Both reuse the same category deduction (`deduceAosomCostwayCategory`) and the same stock rule
(stock ≥ 20 to be sellable).

---

# Part 1 — EU adapter (`aosom.ts`)

## Feed

- URL: `https://feed.aosomcdn.com/390/201_feed/0/0/ed/056920.txt`
- ~21 MB plain text, **TAB-delimited** (not RFC-quoted CSV); thousands of rows, refreshed daily.
- Schema (9 columns): `SKU | Title | Short Description | Base image | Image | Colour | Price |
  Special Price | Stock`.

### Field quirks (verified against the live feed)

- Currency is **EUR** with a suffix on each price, e.g. `113.99 EUR`.
- `Price` is the normal/list price; `Special Price` the discounted sell price. Many rows have an
  empty `Special Price` (no discount).
- `Image` is a comma-joined list of URLs; `Base image` is the primary/thumbnail.
- `Stock` is free text `In Stock` / `Out of Stock` (no numeric count).
- `Short Description` is HTML (`<ul><li>…`) and can span **multiple physical lines** in an otherwise
  unquoted TSV — handled by `parseAosomTsv`.
- Titles are prefixed `HOMCOM` and suffixed `| Aosom Ireland`.
- **No Category and no Brand column** — the category tree is deduced from keywords, brand is `HOMCOM`.

## Pricing formula (EU)

```
sell = Special Price (fallback Price), parsed to EUR minor units
priceMinorUnits     = charmEur(sell)                       // what customers pay
listPriceMinorUnits = charmEur(round(sell × 1.20))         // Compare-at "was" badge only
```

There is **no cart-discounting deal** — the 20% markup is a strikethrough badge rendered by the
storefront from the variant's `Compare at price` attribute. The user rejected applying the deal
engine to the markup.

## Stock rule (EU / UK)

```
Stock ≥ 20  → import as sellable
Stock < 20  → outOfStock (note: EU feed is free text; "In Stock" → 20 so the ≥ 20 gate passes,
             "Out of Stock" → 0)
```

---

# Part 2 — UK pod adapter (`aosom-uk.ts`)

## Feeds

The UK pod ships **two** S3 files that must be joined:

| Feed | URL (ETag-verified, trailing `/` 403s) | Bytes |
| --- | --- | --- |
| Product | `https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/51/056920.txt` | 40,738,412 |
| Stock | `https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/4e/056920.txt` | 1,177,694 |

Both are plain TSV (unquoted, multi-line descriptions) with a header line. They join **1:1 on `SKU`**
(12,522 product rows = 12,522 stock rows, verified).

### Product feed (11 cols)

`SKU | Title | Short Description | Description | Base image | Image | Category | Colour |
Category One | Category Two | Psin`

### Stock feed (10 cols)

`SKU | Stock | 2B Product Price | shiping_fee | 2B-VIP | 2B-S | 2B-A | 2B-B | 2B-C | Sin`

- `Stock` is numeric.
- `2B Product Price` = original/list price (highest, e.g. `63.01 GBP`).
- Tier prices `2B-VIP/S/A/B/C` = wholesale; **`2B-S` is the Wholesale / current sell price**.

## Merge & brand stripping

- `mergeAosomUkFeeds` joins product ↔ stock on `SKU`, dropping rows that lack a stock row, a numeric
  `Stock`, or a `2B-S` price (so every imported row has a verified price and count).
- `stripUkBrand` removes the `HOMCOM` / `Aosom` brand tokens from title and description, keeping the
  colour suffix (e.g. `HOMCOM Rattan 5-Piece Set Grey` → `Rattan 5-Piece Set Grey`).
- Images on `img.aosomcdn.com` are `httpsify`-ed and de-duplicated.

## Pricing formula (UK)

```
wholesale = parseGbpPrice(2B-S)                        // e.g. £60.49
priceMinorUnits     = charmGbp(wholesale)              // base price stored & sold at
listPriceMinorUnits = charmGbp(round(wholesale × 1.20))// Compare-at "was" badge only (no cart deal)
```

Confirmed scheme: base price = **wholesale, unchanged**; +20% markup is shown **only as a Compare-at
badge**, with **no cart-discounting deal** (the deal engine discounts the stored base price, so a
"deal" would defeat the markup — hence badge-only).

## Brand, tags, grouping

- `tags: ['aosom','uk']`, brand `HOMCOM`.
- Colour-variant products group into one product (`groupKey`) with each `Colour` a variant, mirroring
  Costway.

---

# Thresholds (all pods)

- **Price floor (50):** *only* non-UK pods (EU `AOSOM_PROFILE`, US `FRAGRANCEX_PROFILE`). Any product
  whose final base price is `< 5000` minor units (EUR/USD 50) is skipped.
- **UK pod (Costway UK `COSTWAY_PROFILE` + Aosom UK `AOSOM_UK_PROFILE`):** the 50 price floor is
  **disabled**. Any- price product imports so long as **stock ≥ 20**.
- **Stock guard:** products with stock `< 20` are imported as `OUT_OF_STOCK`, never sellable; set by
  `OUT_OF_STOCK_THRESHOLD = 20` in `costway.ts`.

This is driven per-pod by `AdapterProfile.enforcePriceFloor` in `import-engine.ts`:
`COSTWAY_PROFILE`/`AOSOM_UK_PROFILE` → `false`; `AOSOM_PROFILE`/`FRAGRANCEX_PROFILE` → `true`.

## Costway UK markup

`COSTWAY_PROFILE` (`PRICE_MARKUP_RATE` in `costway.ts`) is now **0.20** (was 0.30), baked into the
base price. Same badge-only intent: the 20% sits inside `applyIngestPricing`, not a discount deal.

---

# Category deduction (shared)

`deduceAosomCostwayCategory` (in `aosom.ts`) is the shared fallback; the UK adapter first consults a
large explicit `CATEGORY_MAP` (225 distinct Aosom `Category One > Two` combos → Costway-style `>`
paths, e.g. `Garden & Outdoor > Garden Shades > Gazebo & Marquees` → `Outdoor > Gazebo & Marquees`),
then the keyword fallback, then `['Uncategorised']`. Costway multi-level paths are auto-created via
`ensureCategoryPath`.

---

# Running it

Register the daily scheduler row for the house vendor:

```bash
cd apps/api
# EU single feed
npx tsx scripts/register-aosom-schedule.ts <vendor> --eu      # register (enable)
npx tsx scripts/register-aosom-schedule.ts <vendor> --eu --disable
# UK two-feed merged pod
npx tsx scripts/register-aosom-schedule.ts <vendor> --uk      # register (enable)
npx tsx scripts/register-aosom-schedule.ts <vendor> --uk --disable
```

The `--uk` variant writes the combined `AOSOM_UK_SOURCE` (pipe-delimited `PRODUCT_URL|STOCK_URL`) to
`ImportSchedule.url`; the scheduler fetches both via `Promise.all`, merges on SKU, then adapts with
`AOSOM_UK_PROFILE`. A `DRY_RUN` first is recommended; a full `APPLY` processes the whole feed once.

# Tests

- `apps/api/src/importers/aosom.test.ts` — EU adapter (fixture `__fixtures__/aosom-sample.txt`):
  multi-line description, colour variants, discount, out-of-stock, 20% Compare-at.
- `apps/api/src/importers/aosom-uk.test.ts` — UK adapter: GBP parsing, product/stock TSV parse,
  merge/join, brand strip, category map, `charmGbp` pricing (base = wholesale, Compare-at > base),
  stock < 20 → outOfStock, `isAosomUkSource`.
