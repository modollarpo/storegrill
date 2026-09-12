# Deploy Runbook — StoreGrill on Azure (Terraform)

Operational guide for provisioning regional pods, deploying apps, and wiring DNS.
Terraform lives under `infra/terraform/` (`modules/pod`, `live/pods/<REGION>`, `live/global`).

## 0. Prerequisites

- Azure CLI logged in: `az login` (subscription `a7d8e706-...`).
- Terraform ≥ 1.9.
- RBAC: your user needs **Key Vault Secrets Officer** on the pod resource group
  (`az role assignment create --assignee-object-id <oid> --assignee-principal-type User --role "Key Vault Secrets Officer" --scope /subscriptions/<sub>/resourceGroups/rg-storegrill-prod-<REGION>`).
  Propagation can take a few minutes before `apply` can write secrets.
- **Backend quirk**: `terraform init` may fail fetching storage keys (`listKeys ... connection reset`).
  Workaround — export the key directly:
  ```powershell
  $env:ARM_ACCESS_KEY = az storage account keys list --account-name ststoregrilltfstate --resource-group rg-storegrill-tfstate --query "[0].value" -o tsv
  ```

## 1. Provision a regional pod (first time)

1. Copy `infra/terraform/live/pods/UK` to `live/pods/<REGION>` and adjust `terraform.tfvars`:
   - `region_key` (e.g. `US`), Azure `location`, `cors_origins` (web origins),
     `deploy_translator`, `database_names` (defaults: `storegrill`, `storegrill_dev`, `storegrill_test`),
     optional `dev_client_ip` firewall entry.
2. Init + plan + apply:
   ```bash
   terraform -chdir=infra/terraform/live/pods/<REGION> init
   terraform -chdir=infra/terraform/live/pods/<REGION> plan -input=false -out=tfplan.bin
   terraform -chdir=infra/terraform/live/pods/<REGION> apply -input=false -auto-approve tfplan.bin
   ```
   ~30 resources: 4 App Service apps (api/web/admin/vendor), PostgreSQL Flexible Server +
   3 databases, Key Vault (+ payment/mail/JWT/DB secrets), storage + media container,
   managed identity, plan, Log Analytics, App Insights.
3. Record outputs: `web/api/admin/vendor_hostname`, `postgres_fqdn`, `key_vault_name`.

### Post-apply database setup

Local dev DB URL is derived from the production connection string by swapping the database name:

```powershell
$secret = az keyvault secret show --vault-name kv-storegrill-<flat> --name postgres-connection-string --query value -o tsv
# dev:  $secret -replace '/storegrill?', '/storegrill_dev?'
# test: $secret -replace '/storegrill?', '/storegrill_test?'
```

- Apply schema to dev/test: `DATABASE_URL=<url> npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`
- Demo data (never in prod): `npx tsx apps/api/seed.ts` (guarded; refuses when `NODE_ENV=production`).
- Production admin + regions: see §3 bootstrap.

## 2. Deploy applications

### Automatic deploys

`.github/workflows/deploy-api-web-aca.yml` deploys the storefront (web) and API to
all 5 prod regions (UK, US, EU, AE, NG) automatically. It is triggered by
`workflow_run` on the **CI Quality Gates** workflow completing successfully for a
`master` push, so a green `master` CI run now rolls the code out to every pod.
Images are tagged `api:build-<run_id>` / `web-<region>:build-<run_id>` so each
push deploys a fresh image (no stale tags).

Required repo secrets (already present for manual deploys):
- `AZURE_CREDENTIALS` — service principal JSON for `azure/login`.
- `ACR_USERNAME` / `ACR_PASSWORD` — ACR registry login.
- `ARM_SUBSCRIPTION_ID` — subscription for `az account set`.

### Manual deploys

Use **Deploy API + Web (ACA)** (`.github/workflows/deploy-api-web-aca.yml`,
`workflow_dispatch`) to deploy a specific image tag or branch, e.g. roll back to a
known-good version or build from a feature branch.

Inputs: `api_version`, `web_version` (image tags), `branch`
(default `master`), `deploy_regions` (default `UK,US,EU,AE,NG`).

**Deploy Admin + Vendor (ACA)** (`.github/workflows/deploy-admin-vendor-aca.yml`,
`workflow_dispatch`) stays manual — admin/vendor are not auto-deployed.

Packaging (all validated locally):
- API: esbuild bundle (`--external:@prisma/client`) + shipped `.prisma`/`@prisma/client`
  engines + minimal `package.json` (`start: node index.js`). Health: `/api/health`.
- Next apps: `output: 'standalone'`; package root gets `{ "scripts": { "start": "node apps/<app>/server.js" } }`
  because standalone output nests under `apps/<app>/`. Health: `/api/healthz`.

Notes / caveats:
- **Migrations from CI**: GitHub runners are not Azure IPs; PostgreSQL firewall must allow them,
  or run `prisma migrate deploy` from an allowed machine instead.
- **HOSTNAME binding**: if a Next app binds to loopback only, add app setting `HOSTNAME=0.0.0.0`.
- Apps use `WEBSITE_RUN_FROM_PACKAGE=1`; deploys are zip packages via `az webapp deploy`.

### Container Apps image pull (ACR registry credentials)

The web/api container apps pull images from `storegrillcr.azurecr.io` using the ACR admin
account (`storegrillcr` / admin password). A freshly created app has **no registry
credentials** and therefore always starts on the mcr `containerapps-helloworld` placeholder
(`az containerapp update --image ...` fails with `UNAUTHORIZED: authentication required`).

To fix a live app (this happened for UK and AE web apps):

```powershell
$acrPassword = az acr credential show -n storegrillcr --query "passwords[0].value" -o tsv
az containerapp registry set -g rg-storegrill-prod-<REGION> -n app-storegrill-web-prod-<REGION> `
  --server storegrillcr.azurecr.io --username storegrillcr --password $acrPassword
az containerapp update -g rg-storegrill-prod-<REGION> -n app-storegrill-web-prod-<REGION> `
  --image storegrillcr.azurecr.io/web-<region>:build-<run_id>
```

To make Terraform-created apps carry the registry from the start (so a fresh apply doesn't
produce a placeholder app), pass on the pod module / in `terraform.tfvars`:

```hcl
acr_password = "<ACR admin password>"   # sensitive; never commit. Empty = no registry block.
```

See also: the running-image credentials are mutable live state on the container apps, not
reconciled by `infra/terraform/` (its container-app blocks are placeholders). If an app is ever
recreated from Terraform without `acr_password`, re-apply the `az containerapp registry set`
step above before deploying images.

## 3. Bootstrap production data

After first deploy (workflow input or locally against the pod DB):

```powershell
$env:DATABASE_URL = <production connection string from KV>
$env:BOOTSTRAP_ADMIN_EMAIL = ...
$env:BOOTSTRAP_ADMIN_PASSWORD = ...
npx tsx scripts/bootstrap-prod.ts
```

Idempotent: upserts the six regions (UK/US/EU/IN/NG/GH) and promotes the admin user.

### 3.1 Category curation (homepage departments)

The homepage `featured` categories are curated per pod, not auto-derived. After any
feed/importer lands (which can introduce vendor-named roots like `Costway`, duplicate
or narrow top-level categories), re-run the reconciliation script per pod:

```powershell
$env:DATABASE_URL = <KV secret postgres-connection-string>
npx tsx apps/api/scripts/curate-categories.ts          # dry run: review the PLAN, no writes
npx tsx apps/api/scripts/curate-categories.ts --apply  # apply (idempotent)
npx tsx apps/api/scripts/verify-categories.ts          # assert curated invariants
```

The schema columns behind curation (`isFeatured`, `displayOrder`, `tagline`) are additive;
pods are synced via `prisma db push` (see `docs/audit-2026.md`), and the migration in
`apps/api/prisma/migrations/` is the CI-from-zero baseline.

**Auto-updating tiers (no manual work needed after curation clean):**

- Department cards (`GET /api/v1/categories?featured=true&includeProducts=true`) show the
  **newest** ACTIVE products in each curated subtree, so tiles change automatically as feeds land.
- A second tier, `?sort=recent&offset&limit`, returns non-featured categories ranked by
  **newest product activity** (newest ACTIVE product under each root), excluding vendor-branded
  roots by name collision with their sole vendor, derived from data, not hardcoded brands —
  this is the "Recently added" feed on the homepage. It is paginated (`hasMore`) and infinite-scrolled
  client-side with the Storegrill spinner. New categories surface automatically once their first
  products land, and the feed re-orders itself as imports arrive.
- Translation caveat: the server-rendered initial feed is translated for non-EN locales; rows fetched
  by infinite scroll render merchant titles untranslated until a real translator service is wired
  (Azure OpenAI/translator pod — `deploy_translator=false` today).

## 4. DNS (global)

1. Seed `infra/terraform/live/global/terraform.tfvars` with each region's four hostnames
   and custom-domain verification IDs (pod outputs `*_custom_domain_verification_id`).
2. Apply: `terraform -chdir=infra/terraform/live/global apply ...`
   Creates zone `storegrill.net`, `<region>`/`<region>-api`/`<region>-admin`/`<region>-vendor` CNAMEs,
   `asuid.*` TXT validation records, and `www`.
3. Point the registrar at the zone name servers (`terraform output name_servers`).
4. **Manual step**: bind each custom hostname to its App Service (portal or
   `az webapp config hostname add`) — hostname bindings are not yet managed in Terraform.

## 5. Quality gates & CI

- Gates: `npm run lint`, `npm run gate:ui`, `npm run typecheck`, `npm run test`, `npm run build`.
- Integration tests require `TEST_DATABASE_URL` (loaded from `apps/api/.env` via `vitest.setup.ts`;
  CI provisions a Postgres service container automatically).
- CI (`.github/workflows/ci.yml`): gates + `terraform fmt/validate` on module and global.
- Raw SQL must quote PascalCase table names (`DELETE FROM "Order"`) — Postgres folds unquoted
  identifiers to lowercase.

## 6. Known flakiness

- Vitest workers can crash natively on Windows (0xC0000409) during teardown — rerun.
- First build after cleaning `.next` may hit transient file locks ("Cannot find module for page") — rerun.
