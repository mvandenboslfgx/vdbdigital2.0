# Invoices Financial Migration

File: `supabase/migrations/20260719160000_invoices_financial_documents.sql`

Local only:

```powershell
Get-Content supabase/migrations/20260719160000_invoices_financial_documents.sql -Raw |
  docker exec -i supabase_db_vdbdigital2 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Then:

```bash
npm run db:verify-invoices-financial
npm run db:verify-quotes-acceptance
npm run db:verify-documents-storage
npm run db:verify-project-management
npm run db:verify-auth-portal
npm run catalog:verify-no-tawk
```

Preconditions: localhost Docker DB, `CHECKOUT_ENABLED=false`, `P05_MIGRATION_APPLIED` unset, no `--linked`.
