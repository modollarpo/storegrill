# Super-Pod Fulfillment & Corridor Plan

Status: design plan. Confirmed against `scripts/bootstrap-prod.ts` (6 regions:
`UK, US, EU, AE, NG, GH`) and `packages/shared/src/models/region.ts` (44 per-country
data seeds). The 44 country seeds are **data** (currency/VAT/shipping) seeded into the
6 super-pods — they are NOT separate infrastructure pods.

## 1. Super-pod model (confirmed)

| Super-pod | Covers | Notes |
|---|---|---|
| `UK` | United Kingdom | its own pod |
| `US` | **United States + Canada** (North America) | the only Americas pod in the launch set |
| `EU` | All European countries (IE, DE, FR, IT, ES, PT, NL, BE, LU, AT, CH, SE, NO, DK, FI, EE, LV, LT, PL, CZ, SK, HU, RO, BG, HR, SI, GR, CY, MT) | one web app serves all of Europe |
| `AE` | UAE/Gulf + India/APAC (AE, SA, QA, KW, BH, OM, IN, AU, JP, NZ) | Dubai super-pod; the India+PAPAC pod renamed to AE |
| `NG` | Nigeria + West/Central Africa hub | corridor hub |
| `GH` | Ghana + remaining Africa hub | corridor hub |

**Important clarification on the live subdomains.** The current DNS has these country
subdomains still on the old IP `4.231.92.28`:
`at, au, be, ca, de, es, fr, ie, it, nl, pl, se, us`.

- `us` (United States) and `ca` (Canada) are the **only Americas** here → `US` pod.
- `at` (Austria) is **NOT America** — it is Europe → `EU` pod.
- `au` (Australia) is APAC → `AE` pod.
- `be, de, es, fr, ie, it, nl, pl, se` are all Europe → `EU` pod.

So under grouping, `us`/`ca` belong to the US super-pod and `at`/the rest of Europe belong
to the EU super-pod. They must not be lumped together.

## 2. Why a UK supplier cannot fulfill EU (the duty trap)

Post-Brexit, a UK seller shipping to an EU customer triggers **import VAT + customs
clearance**, and the UK seller is outside the EU OSS scheme. For many items this makes
UK→EU uneconomic or restricted. The same logic applies US-bound: tariffs apply on
UK/EU→US imports. Therefore a UK supplier should be **excluded from EU/US fulfillment**
(or priced with the duty, which loses to a local supplier). This is expressed as data:
the supplier simply does not *serve* those regions.

## 3. Supplier model (region is data, not code)

Extend `VendorProfile` / supplier record with:

- `servingRegions: string[]` — regions the supplier can fulfill from.
  e.g. UK supplier → `[UK]`; EU supplier → `[EU]`; corridor supplier → `[NG, UK, EU, US]`.
- `corridor: boolean` (optional tag for hub suppliers).

`RegionConfig` already supports `IMPORT_DUTY` tax rules
(`packages/shared/src/models/region.ts`), so the engine can compute landed cost per route.

## 4. The NG + Asia corridor (hub-and-spoke)

- **Asia/IN** = manufacturing source. Bulk **ocean freight** Asia → **NG hub**
  (very low $/kg).
- **NG hub** fulfills NG/GH/Africa locally (cheap domestic last-mile) **and re-exports
  consolidated containers** to UK/EU/US. One customs entry per container amortizes duty
  across many units — far cheaper than parcel-by-parcel.
- **Reverse corridor**: UK/EU goods → NG → rest of Africa (southbound); African goods
  (NG/GH local products) → UK/EU/US (northbound).
- Cost win: bulk freight + single clearance + domestic delivery >> individual
  international parcels.

## 5. Fulfillment routing (the engine)

For each cart line:

1. Candidates = suppliers with stock **that serve the customer region**.
2. Landed cost = `price + duty(if border crossed) + shipping`.
3. Pick the minimum landed cost.
4. Group lines by vendor for shipping (existing per-vendor shipping logic in
   `apps/api/src/routes/orders.ts`).

If no local supplier exists, the corridor supplier serving that region wins. No
`if (region === …)` branching — purely data-driven.

## 6. Code / infra changes

- **Data**: supplier `servingRegions` + duty rules per corridor route. The 44 country
  seeds map into the 6 pods (EU pod holds all European country configs; NG/GH hold
  Africa; AE holds APAC + Gulf).
- **Engine**: order service becomes supplier-region-aware (uses `IMPORT_DUTY`).
- **Infra**: nothing special for the corridor — it is supplier data + shipping math.
  Pods remain UK/US/EU/AE/NG/GH.

## 7. Front Door — what the "frontend" looks like

Front Door is **edge infrastructure, not a separate app**. The frontend stays the existing
Next.js web app (one per pod, pinned by `SG_REGION_KEY`). Front Door:

- Terminates TLS / WAF / caches at the edge.
- **Routes** by subdomain + geo: `uk/eu/us/ae/ng/gh.storegrill.net` → respective pod
  origin; `/api/*` → that pod's API; apex `www` + `*` → geo-routed to the nearest healthy
  pod (Europe→EU, US→US…) or a default.
- A small **region selector** in the UI lets a user switch region/currency.

So "Front Door frontend" = routing rules + WAF + one TLS cert; the per-pod web app is
unchanged. Provision later (currently `deployFrontDoor` is off).

## 8. Phased DNS rollout (interim mapping)

- **Now**: UK pod live; apex `storegrill.net` + `www` + `*` wildcard → UK pod (pilot). ✅ done.
- **European country subdomains** (`at, be, de, es, fr, ie, it, nl, pl, se`): interim →
  UK pod web app (stops the dead old IP), then CNAME to `eu.storegrill.net` when the EU
  pod ships.
- **`au`**: interim → UK pod (or IN pod when shipped).
- **`us`, `ca`**: leave on old IP until the **US** pod is deployed, then → US pod.
- **Later**: deploy EU/US/AE/NG/GH pods → repoint subdomains; provision Front Door for
  geo-routing; stand up NG/Asia corridor suppliers + bulk freight and switch on
  cross-region fulfillment.

## 9. Open points to confirm

- Africa coverage: seeds include ZA, KE, UG, TZ, EG, MA beyond NG/GH. Decide whether
  NG (West/Central Africa hub) and GH (other Africa hub) jointly cover all Africa, or
  split explicitly.
- Whether `ca` sits in the `US` pod or gets its own North-America pod.
- Whether `au/jp/ae` sit in the `AE` pod or get an explicit APAC pod.

## 10. Pinned Azure regions & cost

Recorded in `docs/cost-estimate.md`. Summary: UK=UK South, US=East US, EU=Germany West
Central, AE=Central India (the former IN pod reused; `uaenorth` for a future local Dubai
deploy), NG=South Africa North, GH=South Africa West. Per-pod ~$19–23/mo
(DB-dominated); 6 pods ≈ **~$130/mo** (one free DB) → ~$150/mo all paid; ~7–8× cheaper than
44 individual region pods.
