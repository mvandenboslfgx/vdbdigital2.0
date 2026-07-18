# Quotes Acceptance Migration Evidence Template

Copy to a **gitignored** path, e.g. `docs/evidence/quotes-acceptance-YYYYMMDD.md`.

```md
# Quotes acceptance — local migration evidence

Date (UTC):
Operator:
Host: localhost / 127.0.0.1 only
Docker container: supabase_db_vdbdigital2
Remote/linked: NO

## Env guards
CHECKOUT_ENABLED=
P05_MIGRATION_APPLIED=
(expect false / unset)

## Migration
File: supabase/migrations/20260719140000_quotes_acceptance.sql
sha256:
Applied via: docker exec … psql (local)

## Verifiers
npm run db:verify-quotes-acceptance →
npm run db:verify-documents-storage →
npm run db:verify-project-management →
npm run db:verify-auth-portal →
npm run catalog:verify-no-tawk →

## Gates
npm run lint →
npm run typecheck →
npm test →
npm run test:access-control →
npm run build →

## Confirmations
- [ ] No remote migration
- [ ] No Mollie call
- [ ] Accept creates no payment/invoice
- [ ] No Tawk
- [ ] Evidence not committed
```
