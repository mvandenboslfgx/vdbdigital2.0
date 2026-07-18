# Documents Storage Migration

File: `supabase/migrations/20260719120000_documents_storage.sql`

Local only:

```powershell
Get-Content supabase/migrations/20260719120000_documents_storage.sql -Raw |
  docker exec -i supabase_db_vdbdigital2 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Then: `npm run db:verify-documents-storage`

Evidence template: `docs/DOCUMENTS_STORAGE_MIGRATION_EVIDENCE_TEMPLATE.md` → gitignored `docs/evidence/`.
