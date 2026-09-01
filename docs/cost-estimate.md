# StoreGrill Azure Cost Estimate & Pinned Regions

Scope: the **6 super-pods** (UK, US, EU, IN, NG, GH). The 44 country seeds in
`packages/shared/src/models/region.ts` are per-country **data** seeded into these pods,
not separate infrastructure. Pricing is 2026 pay-as-you-go, region-dependent; the only
region-variable line is the database.

## Pinned Azure regions per pod

| Pod | Azure region | Why | PostgreSQL B1ms compute/mo |
|---|---|---|---|
| `UK` | **UK South** (uksouth) | already deployed; UK data residency | $14 (free 12 mo, 1st pod) |
| `US` | **East US** (eastus) | cheapest US region; serves US + CA | $12 |
| `EU` | **Germany West Central** (germanywestcentral) | EU member state, central latency; equal-price alternatives: Sweden Central, Belgium Central, West Europe, France Central, North Europe (~$15) | $15 |
| `IN` | **Central India** (centralindia) | APAC hub; serves IN + AU/JP/AE | $15 |
| `NG` | **South Africa North** (southafricanorth) | no Azure region in Nigeria; nearest | $16 |
| `GH` | **South Africa West** (southafricanwest) | no Azure region in Ghana; distributed across Africa | $16 |

> No Azure region exists in Nigeria or Ghana, so both Africa pods run in South Africa.
> They are logically separate pods (own RG + DB) but physically in the SA geography.

## Per-pod monthly cost (low traffic)

| Resource | UK | US | EU | IN | NG | GH |
|---|---|---|---|---|---|---|
| PostgreSQL B1ms compute | $14* | $12 | $15 | $15 | $16 | $16 |
| Storage 32 GB | $4 | $4 | $4 | $4 | $4 | $4 |
| Container Apps (4 apps, scale-to-zero) | ~$0 | ~$0 | ~$0 | ~$0 | ~$0 | ~$0 |
| Log Analytics + App Insights | ~$1 | ~$1 | ~$1 | ~$1 | ~$1 | ~$1 |
| Key Vault + Blob | ~$2 | ~$2 | ~$2 | ~$2 | ~$2 | ~$2 |
| **Pod total** | **~$21** | **~$19** | **~$22** | **~$22** | **~$23** | **~$23** |

\* UK DB free for 12 months (one free B1ms per subscription).

## Totals

- **6 pods, one free DB**: ~$19+$22+$22+$23+$23 (US/EU/IN/NG/GH paid) + ~$21 UK (free DB)
  ≈ **~$130/mo** all-in.
- **After free DB tier / all paid**: ~$21×6 ≈ **~$150/mo**.
- **Vs 44 individual region pods** (old model): 44 × ~$21 ≈ **~$920/mo** — the super-pod
  grouping cuts infra ~7–8×.

## Free grants (what keeps compute at ~$0)

- **Container Apps**: 180,000 vCPU-s + 360,000 GiB-s + 2M requests **per subscription per
  month** (shared across all 6 pods). Apps scale to zero when idle → effectively $0 at low traffic.
- **PostgreSQL**: 12 months free for **one** B1ms instance per subscription (used by UK pod).
- **Log Analytics/App Insights**: 5 GB ingestion free per month.

## Notes

- The EU/US/NG/GH pods cost essentially the same (~$19–23/mo); spread is driven by DB
  regional price only. No pod is disproportionately expensive.
- **Egress** (Azure → Cloudflare → user) is ~$0.05–0.08/GB, negligible at low traffic. The
  NG↔UK/EU/US corridor flow is bulk freight + this egress, not per-parcel — its savings are
  in duty/shipping, not Azure compute.
- **Front Door** (geo-routing, later): Azure Front Door Standard has **no free tier**,
  ~$35/mo + data transfer. Add on top when provisioned; it also lets edge routing reduce the
  need for always-on pods.
- **Africa coverage**: seeds include ZA/KE/UG/TZ/EG/MA beyond NG/GH. They map to the NG/GH
  Africa pods (no extra pods assumed). If split into dedicated pods, add ~$21/mo each.
