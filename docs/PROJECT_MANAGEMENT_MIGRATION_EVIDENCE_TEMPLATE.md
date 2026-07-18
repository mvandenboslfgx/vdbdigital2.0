# Project Management Migration Evidence Template

Copy to `docs/evidence/` (gitignored). Do not commit secrets.

```text
Date (UTC):
Operator:
Local project_id:
DB host: 127.0.0.1 / localhost
CHECKOUT_ENABLED: false
P05_MIGRATION_APPLIED: (unset)

Migration file: 20260718200000_project_management.sql
SHA256:

Apply method: (docker exec psql / supabase db reset local / other)
Apply result: PASS / FAIL

npm run db:verify-project-management → RESULT:
npm run db:verify-auth-portal → RESULT:
npm run catalog:verify-no-tawk → RESULT:

Notes:
```
