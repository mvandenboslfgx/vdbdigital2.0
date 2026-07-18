# Documents Storage Migration Evidence Template

Copy to `docs/evidence/` (gitignored). No secrets / signed URLs / service keys.

```text
Date (UTC):
Operator:
DB host: 127.0.0.1
CHECKOUT_ENABLED: false
P05_MIGRATION_APPLIED: (unset)

Migration: 20260719120000_documents_storage.sql
SHA256:

npm run db:verify-documents-storage →
npm run db:verify-project-management →
npm run db:verify-auth-portal →
npm run catalog:verify-no-tawk →

Notes:
```
