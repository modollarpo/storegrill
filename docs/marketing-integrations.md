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

Replace `<REGION>` with the region key (UK, US, EU, AE, NG):

| Region | Google Merchant | Facebook | TikTok | Pinterest |
|--------|----------------|----------|--------|-----------|
| UK     | `GET /api/v1/feeds/google-merchant?regionKey=UK` | `.../facebook?regionKey=UK` | `.../tiktok?regionKey=UK` | `.../pinterest?regionKey=UK` |
| US     | `GET /api/v1/feeds/google-merchant?regionKey=US` | `.../facebook?regionKey=US` | `.../tiktok?regionKey=US` | `.../pinterest?regionKey=US` |
| EU     | `GET /api/v1/feeds/google-merchant?regionKey=EU` | `.../facebook?regionKey=EU` | `.../tiktok?regionKey=EU` | `.../pinterest?regionKey=EU` |
| AE     | `GET /api/v1/feeds/google-merchant?regionKey=AE` | `.../facebook?regionKey=AE` | `.../tiktok?regionKey=AE` | `.../pinterest?regionKey=AE` |
| NG     | `GET /api/v1/feeds/google-merchant?regionKey=NG` | `.../facebook?regionKey=NG` | `.../tiktok?regionKey=NG` | `.../pinterest?regionKey=NG` |

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

Ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) are also POSTed to the backend at `/api/v1/analytics/event` (fire-and-forget, `keepalive: true`). This feeds the admin analytics dashboard without requiring a separate integration.
