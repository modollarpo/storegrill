# StoreGrill

Multi-region, multi-vendor marketplace on Azure free tier. Domain: **storegrill.net**.

- **Spec:** [`PROJECT.md`](PROJECT.md) — features, architecture, milestones, DoD.
- **Agent rules:** [`AGENTS.md`](AGENTS.md) — read before writing code.
- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Infrastructure:** [`infra/`](infra/README.md) — Terraform region pods (36 countries).

## Status

Storefront + API running. Enterprise UI build complete (design system, all customer
pages, SEO, i18n via LibreTranslate, geo-detection, 36-region registry). Infra is
Terraform with one isolated pod root per region.

## Quick start (local — no Docker required)

```bash
npm install          # root workspaces
npm run seed         # sample dataset into apps/api/prisma/dev.db (SQLite)
npm run dev          # api :3001 · web :3000 · admin :3002 · vendor-portal :3003
```

The API runs on SQLite locally; the storefront works immediately at
`http://localhost:3000`. UI chrome ships curated translations for
en/de/fr/es/it/nl/pl/pt/ja/ar; catalog content falls back to source language
when no translation provider is reachable.

### Optional: dynamic content translation (LibreTranslate)

Any ONE of these enables machine translation of catalog content:

```bash
docker compose up -d translate                    # local container (needs Docker)
pipx install libretranslate && libretranslate --port 5001   # native Python
# or point at a hosted instance:
#   apps/api/.env -> LIBRETRANSLATE_URL="https://your-host:5001"
#                    LIBRETRANSLATE_API_KEY="..."
```

### Optional containers (production parity)

`docker compose up -d` also provides Postgres, MinIO, Mailpit and Redis for
services not yet wired to SQLite-only mode.

## Deploy (Azure)

Terraform region pods — see [`infra/README.md`](infra/README.md):

```bash
npm run infra:validate
terraform -chdir=infra/terraform/live/pods/DE init && \
terraform -chdir=infra/terraform/live/pods/DE apply      # one pod = one country
terraform -chdir=infra/terraform/live/global apply       # DNS + subdomains
```

CI runs quality gates on PRs and Terraform plan/apply per pod via
`.github/workflows/infra.yml`.
