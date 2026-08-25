# FragranceX Feed Import

FragranceX supplies our fragrance catalog via an FTP dropship feed. This runbook covers how the
import works, how to run it, and the pricing rules derived from market analysis (2026-08).

## Feed

- Host: `ftptest.fragrancex.com`, path `/frgxdatafeed/outgoingfeed_new.csv` (~6 MB, 9.8k rows)
- Credentials live in `apps/api/.env` as `FRAGRANCEX_FTP_USER` / `FRAGRANCEX_FTP_PASSWORD`
  (never commit them; in Azure use Key Vault references)
- Refreshed daily ~22:00 UTC by FragranceX; files are read-only over FTP
- Schema: `ITEM, NAME, DESCRIPTION, BRAND, TYPE, TITLE, Size, Metric_Size, GENDER, MSRP,
  Wholesale_USD/EUR/GBP/CAD/AUD/SAR, IMAGE, URL, QTY`

## Pipeline

1. `ftpFetchToFile` (`apps/api/src/importers/fetcher.ts`) downloads via curl with SSRF checks,
   size cap and retries. FTP has no ETag, so every scheduled run re-processes the file.
2. `runImport` detects the feed by header signature (`isFragranceXHeader`) and applies
   `adaptFragranceXRows` with `FRAGRANCEX_PROFILE`.
3. Rows are grouped by `NAME` into products; each row becomes a variant (SKU = `ITEM`).
4. The standard diff/apply plan creates/updates/archives against the vendor's catalog.

## AdapterProfile

Catalog behavior that differs per vendor is configured, not hardcoded:

| Profile field | Costway | FragranceX |
| --- | --- | --- |
| `currencyCode` | GBP | USD |
| Brand resolution | house brand "Costway" | per-row `BRAND` (~689 brands) |
| Flash-sale deal | `costway-flash-sale` upsert | disabled (`dealSlug: null`) |
| Stock rule | `>10 else 0` threshold | raw `QTY`; product flips to `OUT_OF_STOCK` when total stock reaches 0 (shared `statusOf()`) |

## Pricing formula

Derived from feed math (median MSRP/wholesale = 2.59x) plus discounter street-price research
(street trades at MSRP −20…−50%):

```
MSRP present:  retail = clamp(MSRP x 0.60, wholesale x 1.25 .. wholesale x 2.20)
MSRP absent:   retail = wholesale x 1.70
cents snapped to .99 (roundUpTo99), currency USD
```

The 1.70 default (raised from 1.60 after portfolio margin simulation) applies to ~58% of the
catalog with no MSRP anchor, where we have pricing power without an advertised comparison price.

Examples: Mefisto $178w/$290 MSRP -> $222.99 (floor binds, niche margin is thin);
Cuba Brown $5.50w/$40 MSRP -> $12.99 (ceiling binds, gray-market MSRP).
Unit tests: `apps/api/src/importers/fragrancex.test.ts`.

## Margin protection

- **Pricing floor** (`FX_MARGIN_FLOOR = 1.25`) guarantees >= 20% gross margin on every SKU;
  niche items with thin street margins are floored rather than matched to market.
- **Returns exposure capped**: storefront policy states free returns apply to faulty/incorrect
  items only; change-of-mind returns ship at sender's cost (ProductDetailClient trust badges).
- **Duty disclosure**: PDP delivery block states international orders may incur import duties/
  taxes payable by the recipient - reduces EU-region refund and chargeback friction from US-origin
  shipments.
- **Open risk**: FragranceX's actual per-order fulfillment billing by destination is not in the
  feed; validate with their rate card before scaling paid traffic into remote corridors.

## Shipping

FragranceX fulfills from the US and ships worldwide, so all 12 regions are servable. Rates are
region data (`ShippingZone` rows seeded in `apps/api/seed.ts`): UK/US/EU keep domestic-style
rates with free-shipping thresholds; every other zone was re-priced to realistic cross-border
courier rates with no free tier. Perfume ships ground-only (hazmat) — reflected in carrier lists
and delivery estimates.

## Running it

Manual/first run: create a job through the vendor portal import UI (`POST /api/v1/imports/url`
with `url: ftp://ftptest.fragrancex.com/frgxdatafeed/outgoingfeed_new.csv`, `schedule: true`),
or insert an `ImportJob` of type `URL_FEED`. DRY_RUN first is recommended; a full APPLY takes
~5 minutes for 9.8k rows.

A persistent `ImportSchedule` ("FragranceX daily feed", cron `0 3 * * *`, enabled) pulls and
APPLYs the feed automatically every day at 03:00 UTC - after FragranceX's ~22:00 UTC refresh.
The API's scheduler ticks every 60s; FTP has no ETag so each run re-processes the file and the
diff engine only writes actual changes.

Category display names are title-cased ('Men', 'Women') under the parent 'Fragrances'; slugs
stay lowercase so renames never fork duplicate categories.

Known data quirks: exactly 4 rows per current feed carry `Wholesale_USD = "0.00"` (one variant
each of Amazing Grace by Philosophy, Henry Rose Fog, Xerjoff Opera, Andrew Charles American
Tobacco). They fail validation and are excluded by design - an unknown cost cannot be priced
without risking a loss-making listing. GENDER has one stray lowercase value normalized to
`women`; gift sets report `--` sizes which are omitted from attributes.
