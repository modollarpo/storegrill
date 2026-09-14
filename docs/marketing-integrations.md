# Marketing Integrations — Feeds, GA4, Google Ads

## 1. Product feeds (Google Merchant / Facebook / TikTok / Pinterest)

Feed URLs follow a stable pattern per region and channel:

```
GET /api/v1/feeds/:channel?regionKey=<REGION>
```

Channels: `google-merchant`, `facebook`, `tiktok`, `pinterest`.

| Channel           | Format       | Content-Type                    |
|-------------------|--------------|----------------------------------|
| google-merchant   | XML (GMC)    | `application/xml`                |
| facebook          | CSV          | `text/csv`                       |
| tiktok            | CSV          | `text/csv`                       |
| pinterest         | CSV          | `text/csv`                       |

### How feeds work

- Feeds are built **live from the database** on each request — no stale files.
- Response is cached in-memory for **1 hour** (`Cache-Control: public, max-age=3600`).
- Feed cache is automatically invalidated when an import job completes.
- Builds take ~2 minutes for 11k+ items; repeated crawls pick up changes within the hour window.

### Feed URLs per region

Feeds are served by the pod API at `https://<region>-api.storegrill.net` (not the storefront host). Paste these URLs exactly into each platform (Google Merchant Center → Products → Feeds → Add primary feed).

| Region | Google Merchant | Facebook | TikTok | Pinterest |
|--------|----------------|----------|--------|-----------|
| UK     | `https://uk-api.storegrill.net/api/v1/feeds/google-merchant?regionKey=UK` | `https://uk-api.storegrill.net/api/v1/feeds/facebook?regionKey=UK` | `https://uk-api.storegrill.net/api/v1/feeds/tiktok?regionKey=UK` | `https://uk-api.storegrill.net/api/v1/feeds/pinterest?regionKey=UK` |
| US     | `https://us-api.storegrill.net/api/v1/feeds/google-merchant?regionKey=US` | `https://us-api.storegrill.net/api/v1/feeds/facebook?regionKey=US` | `https://us-api.storegrill.net/api/v1/feeds/tiktok?regionKey=US` | `https://us-api.storegrill.net/api/v1/feeds/pinterest?regionKey=US` |
| EU     | `https://eu-api.storegrill.net/api/v1/feeds/google-merchant?regionKey=DE` | `https://eu-api.storegrill.net/api/v1/feeds/facebook?regionKey=DE` | `https://eu-api.storegrill.net/api/v1/feeds/tiktok?regionKey=DE` | `https://eu-api.storegrill.net/api/v1/feeds/pinterest?regionKey=DE` |
| AE     | `https://ae-api.storegrill.net/api/v1/feeds/google-merchant?regionKey=AE` | `https://ae-api.storegrill.net/api/v1/feeds/facebook?regionKey=AE` | `https://ae-api.storegrill.net/api/v1/feeds/tiktok?regionKey=AE` | `https://ae-api.storegrill.net/api/v1/feeds/pinterest?regionKey=AE` |
| NG     | `https://ng-api.storegrill.net/api/v1/feeds/google-merchant?regionKey=NG` | `https://ng-api.storegrill.net/api/v1/feeds/facebook?regionKey=NG` | `https://ng-api.storegrill.net/api/v1/feeds/tiktok?regionKey=NG` | `https://ng-api.storegrill.net/api/v1/feeds/pinterest?regionKey=NG` |

> **EU pod:** the continent pod serves all European country keys (DE, FR, IE, NL, …). Use a **country key**, not `regionKey=EU` — the feed route validates against `DEFAULT_REGIONS`, which lists sellable countries only. Swap `DE` for the market (e.g. `FR` for France, `IE` for Ireland) to get that country's feed.
>
> **AE/NG pods** return a valid feed with **0 items** until products are uploaded — an empty `google-merchant` feed will be rejected by Merchant Center with "no items", that is expected today.

### Feed status endpoint

`GET /api/v1/feeds/status?regionKey=<REGION>` (public) returns the latest recorded build for all four channels:

```json
{ "regionKey": "UK", "feeds": { "google-merchant": { "itemCount": 11596, "builtAt": "…", "status": "SUCCESS" } } }
```

Use it to confirm a pod has picked up products before submitting the URL to a publisher.

### Feed warming

A scheduler job pre-builds every active region's feeds hourly (only regions that have priced products in the pod's DB — so empty AE/NG pods are skipped). Publishers therefore hit a warm cache instead of triggering a one-off 2-minute cold build. Disable with `FEED_WARMER_ENABLED=false`.

### Feed build telemetry

Every feed build (success or failure) is recorded on the `FeedGenerationLog` table — region, channel, status, item count, build duration and error message. Persisted metrics power:

- **Admin console → Feeds** (`GET /api/v1/admin/feeds/latest`): latest build per region × channel, with Empty/Failed/OK badges and item counts.
- **Per channel history** (`GET /api/v1/admin/feeds/history?regionKey=<REGION>&channel=<CHANNEL>`): last 20 builds for one feed.

An empty feed (0 items, e.g. AE/NG before products are uploaded) shows as `Empty`, not `OK`, so a misconfigured ingest is visible at a glance.

### Google Merchant requirements met

- `<g:country>` matches region shipping country (verified: GB for UK feed).
- Prices feed as raw integer minor units divided by 100 (e.g. £24.99).
- `<g:availability>` reflects live stock ≥ 20.
- `google_product_category` mapped from internal categories via `CATEGORY_TO_GOOGLE`.

### Link pattern

All product links point to `https://<region>.Storegrill.net/products/<slug>`.

---

## 2. Google Analytics 4 (GA4)

GA4 is loaded via **gtag.js**, config-driven (no hardcoded IDs).

### Setup

Set the following env vars in each web app's configuration:

| Env var                        | Required | Description                         |
|--------------------------------|----------|-------------------------------------|
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Yes    | GA4 property ID (G-XXXXXXX)        |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`      | No     | Google Ads conversion ID (AW-XXXX) |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | No | Conversion label for purchase events |

### Consent

GA4 respects the `sg_consent` cookie. Events only flow to GA4 when `analytics: true` is set. Google Ads requires `marketing: true`. The `CookieBanner` component handles this, and the AnalyticsProvider updates the consent mode defaults reactively.

### Enhanced ecommerce events fired

| Event name        | When                                       | Source component       |
|-------------------|---------------------------------------------|------------------------|
| `page_view`       | Every SPA navigation                        | AnalyticsProvider      |
| `search`          | User visits `/search?q=...`                 | AnalyticsProvider      |
| `view_item`       | Product detail page mounts                  | ProductDetailClient    |
| `add_to_cart`     | User clicks "Add to basket"                 | AddToCartButton        |
| `begin_checkout`  | Checkout page mounts                        | Checkout page          |
| `purchase`        | Order placed successfully (before redirect) | Checkout page          |

### Google Ads conversion tracking

When `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` are both set, a `conversion` event with `send_to: <ADS_ID>/<LABEL>` is fired on each purchase.

### Guaranteed purchase beacon before navigation

The `purchase` event (GA4 + Ads conversion when enabled) is not fire-and-forget on the success path — checkout awaits the gtag `event_callback` before navigating to `/checkout/confirmation`. `event_timeout` (2000 ms) is set as a fallback, and the callback is invoked immediately when gtag isn't loaded (e.g. consent denied), so the order never depends on tag processing. This is the same guarantee as Google's `gtagSendEvent` delayed-navigation snippet, implemented inside `AnalyticsProvider.track()` instead of a global script so the purchase event is fired exactly once.

### Items payload format

All ecommerce events include an `items` array per GA4 spec:

```json
[
  {
    "item_id": "<variantId-or-productId>",
    "item_name": "Product Name",
    "item_category": "Kitchen & Dining",
    "item_brand": "Vendor Name",
    "price": 24.99,
    "quantity": 1,
    "currency": "GBP"
  }
]
```

### Internal analytics

All GA4 events (`page_view`, `searchhit`, `detail`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`) are also POSTed to the backend at `/api/v1/analytics/event` (fire-and-forget, `keepalive: true`). This backs the admin analytics dashboard without requiring a separate integration.

### Verifying GA4 vs first-party data

Because every GA4 event is mirrored to the `AnalyticsEvent` table in the pod DB, you can sanity-check GA4's numbers against your own data:

- **Admin console → Analytics → "First-party event stream"** shows last-14-day counts by event type, day and region (`page_view` vs GA4's report, cart/checkout drop-off vs GA4's funnel, `purchase` count vs the store's paid orders).
- Raw endpoint: `GET /api/v1/admin/analytics/events?days=14[&eventType=PURCHASE][&region=UK]` (admin auth). `days` caps at 90; the window is the last N full days (excludes the current, still-filling day so totals match GA4's daily aggregation).

Expect the first-party `page_view` count to be **lower** than GA4's — the API watcher only records SPA navigations on bundle load, while GA4 also fires on full page loads that never hydrate. Volume trends, funnel shape and purchase counts should track closely.
