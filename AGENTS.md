# AGENTS.md — Working Agreement for Coding Agents

This file tells coding agents (opencode, Cursor, Copilot, etc.) how to work in this repo. Read `PROJECT.md` and `docs/architecture.md` before writing any code.

## Repo layout

```
apps/api               REST API (Functions/App Service)
apps/web               Customer storefront
apps/admin             Admin backend
apps/vendor-portal     Vendor dashboard
packages/shared        Domain models, money/tax/shipping/deal engine, i18n
infra/                 Bicep (main.bicep + modules/)
docs/                  Architecture, data model, runbooks
```

## Non-negotiables

- **Money is integer minor units** (`amountMinorUnits: bigint` + `currencyCode`). Never floats.
- **Region is data, not code.** No `if (region === 'US')` branches. Region config drives currency, language, tax, shipping, deals.
- **No secrets in code or committed files.** Use Key Vault locally via `.env` (gitignored) and in Azure via managed identity + Key Vault references.
- **All UI strings externalized** in `i18n/*.json`. No hardcoded strings in components.
- **No code comments unless the reader needs them.** Prefer self-documenting names.
- Stick to the stack in `PROJECT.md` §4. Ask before introducing new dependencies.
- Run quality gates before claiming "Done".

## Commands

These are the intended root scripts (scaffolded in Milestone 1). Add them to a root `package.json`:

```bash
npm run lint        # eslint across apps/* and packages/*  (root + workspaces)
npm run gate:ui     # UI hygiene: no raw hex in components, no mojibake (scripts/ui-gates.mjs)
npm run typecheck   # tsc --noEmit across all workspaces
npm run test        # vitest unit + integration
npm run build       # tsc/next build per app
npm run dev         # docker compose up + run all dev servers
npm run seed        # load sample dataset (200+ products, 5 vendors, 3 regions)
npm run infra:deploy  # az deployment group create --template-file infra/main.bicep
```

## Working style

1. **Explore first.** Grep/read existing code before writing; match conventions.
2. **Small, reviewable changes.** One concern per commit; conventional commit messages.
3. **Tests with behavior.** When you fix a bug, add a failing test first, then make it pass.
4. **Verify.** Run `lint`, `typecheck`, and the relevant tests after each change.
5. **Update docs.** If behavior or config changes, update `docs/` and `PROJECT.md` where relevant.
6. **Ask when ambiguous.** If a requirement in `PROJECT.md` conflicts with reality (e.g., an Azure free-tier limit), flag it with the alternative before proceeding.

## Azure deployment

- Infra is **Terraform** (`infra/terraform/`): `modules/pod` + one root per regional pod under `live/pods/<REGION>` + `live/global` for DNS. Never hand-edit the portal; changes go through Terraform.
- Region pods: each region (44 at launch) deploys its own web/api/translator apps, SQL DB, Key Vault, storage and App Insights — free-tier SKUs enforced in the module.
- State: Azure Storage remote backend, one state file per pod.
- Secrets flow: managed identity → Key Vault → app settings as Key Vault references in prod; `.env` locally.
- CI: GitHub Actions — quality gates on PR; `.github/workflows/infra.yml` for Terraform plan/apply per pod.

## Definition of Done (per milestone)

- Feature works end-to-end (tests or runnable demo).
- All four quality gates pass (`lint`, `typecheck`, `test`, `build`).
- No secrets committed; nothing hardcoded per-region.
- Docs updated if behavior changed.
