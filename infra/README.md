# StoreGrill Infrastructure — Terraform

Region-pod architecture. Each region is a fully independent deployment ("pod")
with its own database, Key Vault, storage, App Insights, LibreTranslate node,
currency, tax/shipping/payment configuration and subdomain.

```
storegrill.net  (apex → primary pod)
├── us.storegrill.net   ┐
├── uk.storegrill.net   │
├── de.storegrill.net   │  36 regional pods
├── jp.storegrill.net   │  (one Azure resource group each)
└── ae.storegrill.net   ┘
```

## Layout

```
infra/terraform/
  regions.json          # single source of truth: regionKey -> Azure location
  modules/pod/          # reusable regional-pod module (web+api+translator apps, SQL, KV, storage, insights)
  live/
    global/             # DNS zone + subdomain records for every pod
    pods/<REGION>/      # one root per region; isolated state file per pod
```

## Pod contents (per region)

| Resource | SKU | Notes |
|---|---|---|
| Service Plan | F1 (free) | shared by web, api, translator |
| Web app (Next.js) | Node 20 LTS | `SG_REGION_KEY` pins the region |
| API app (Express) | Node 20 LTS | health probe `/api/health` |
| Translator (LibreTranslate) | container | i18n content translation for the pod's languages |
| Azure SQL | Free | per-region database (data residency) |
| Key Vault | standard | JWT secret, SQL connection string via managed identity |
| Storage Account | LRS | private `product-media` container |
| App Insights | pay-as-you-go free grant | workspace-backed |

Optional: `deploy_redis = true` adds Redis `Basic_C0` (~$16/mo — flagged cost).

## State

Remote state in Azure Storage (`rg-storegrill-tfstate` / `ststoregrilltfstate`), one key per pod:
`pods/<region>.tfstate`. Bootstrap once:

```bash
az group create -n rg-storegrill-tfstate -l westeurope
az storage account create -n ststoregrilltfstate -g rg-storegrill-tfstate --sku Standard_LRS
az storage container create -n tfstate --account-name ststoregrilltfstate
```

## Deploy

```bash
npm run infra:validate                 # fmt + validate module & global
npm run infra:apply                    # REGION=de npm run infra:apply (env var)
# or directly:
terraform -chdir=infra/terraform/live/pods/DE init
terraform -chdir=infra/terraform/live/pods/DE apply
terraform -chdir=infra/terraform/live/global apply   # after pods exist (needs hostnames)
```

CI: `.github/workflows/infra.yml` — `validate` on demand, `plan`/`apply`
per target (`global` or `pod:DE`) behind a GitHub environment approval.

## Region data vs infrastructure

Infrastructure is identical across pods by design. Everything customers see —
currency, VAT/GST rates, shipping zones/carriers, payment methods, languages —
is **data** seeded into each pod's database from `packages/shared/src/models/region.ts`.
Adding a country = add a seed row + one directory in `live/pods/`.
