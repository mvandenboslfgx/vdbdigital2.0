# Shared backend RC2 release boundary

## In RC2 local freeze

- Contract: `vdb-backend-contract@0.2.0-rc.2` (unpublished)
- Schema: `2026.07.27.financial-concurrency-rc2`
- Migrations: **42**, final `20260724190000`
- Partner + mobile compat + grant/ACL + financial concurrency
- Storage: six private buckets only
- Dependency baseline: next 16.2.12 + scoped postcss/sharp overrides

## Outside RC2

- RC3 messaging (`2026072512*`)
- Staging apply / remote migration repair / db push
- Production apply (exact-17 does not authorize RC2)
- Checkout enablement / `P05_MIGRATION_APPLIED` / Mollie live
- Package registry publish
- Git push / tag push

## Freeze artifacts

- `contracts/releases/vdb-backend-contract-0.2.0-rc.2/`
- Local annotated tag: `shared-backend-rc2-local-freeze`

## Authorizations still required later

1. Staging preflight (duplicate sales / payout overspend counts) + explicit remote auth
2. Separate production rehearsal + apply manifesto
