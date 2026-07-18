# Auth & Portal — Migration

## Forward-only files

1. `20260717000000_customer_portal.sql` — orgs, memberships, invites, portal tables, RLS, `portal_verify_customer_contracts`
2. `20260718120000_auth_portal_foundation_verify.sql` — `verify_auth_portal_foundation_contracts` alias

## Local apply only

- Target host: `127.0.0.1` / `localhost`
- No `--linked`, no production project
- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset

Example (Docker DB already running):

```bash
docker exec -i supabase_db_vdbdigital2 psql -U postgres -d postgres < supabase/migrations/20260718120000_auth_portal_foundation_verify.sql
npm run db:verify-auth-portal
```

Evidence: `docs/evidence/` (gitignored). Template: `docs/AUTH_PORTAL_FOUNDATION_MIGRATION_EVIDENCE_TEMPLATE.md`.
