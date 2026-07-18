# Project Management Migration

## File

`supabase/migrations/20260718200000_project_management.sql`

Forward-only. Extends `portal_*` — does **not** create a competing `projects` table.

## Local apply only

Preconditions:

- Target host `127.0.0.1` / `localhost`
- No `--linked`
- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset
- No production project ref

Example (Docker):

```bash
Get-Content supabase/migrations/20260718200000_project_management.sql -Raw |
  docker exec -i supabase_db_vdbdigital2 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Then:

```bash
npm run db:verify-project-management
```

## Evidence

Use `docs/PROJECT_MANAGEMENT_MIGRATION_EVIDENCE_TEMPLATE.md` → fill under gitignored `docs/evidence/`.
