# Quotes Acceptance Migration

File: `supabase/migrations/20260719140000_quotes_acceptance.sql`

## Local only

```powershell
# Confirm local target
docker ps --filter name=supabase_db_vdbdigital2

Get-Content supabase/migrations/20260719140000_quotes_acceptance.sql -Raw |
  docker exec -i supabase_db_vdbdigital2 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Then:

```bash
npm run db:verify-quotes-acceptance
npm run db:verify-documents-storage
npm run db:verify-project-management
npm run db:verify-auth-portal
npm run catalog:verify-no-tawk
```

## Preconditions

- Target localhost / local Docker DB only
- No `--linked` / remote project
- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset

## Evidence

Use `docs/QUOTES_ACCEPTANCE_MIGRATION_EVIDENCE_TEMPLATE.md` → store under gitignored `docs/evidence/`.
