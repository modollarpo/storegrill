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

Use the **Deploy app** GitHub workflow (`.github/workflows/deploy-app.yml`, `workflow_dispatch`):

Inputs: `region_key` (UK), `app` (api/web/admin/vendor-portal/all),
`run_migrations`, `bootstrap_admin`.

Required repo secrets:
- `AZURE_CREDENTIALS` — service principal JSON for `azure/login`.
- `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (≥12 chars) — only for the bootstrap input.

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

## 3. Bootstrap production data

After first deploy (workflow input or locally against the pod DB):

```powershell
$env:DATABASE_URL = <production connection string from KV>
$env:BOOTSTRAP_ADMIN_EMAIL = ...
$env:BOOTSTRAP_ADMIN_PASSWORD = ...
npx tsx scripts/bootstrap-prod.ts
```

Idempotent: upserts the six regions (UK/US/EU/IN/NG/GH) and promotes the admin user.

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
