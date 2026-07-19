# Invoices Financial Migration Evidence Template

Copy to gitignored `docs/evidence/invoices-financial-YYYYMMDD.md`.

```md
# Invoices financial — local migration evidence

Date (UTC):
Operator:
Host: localhost only
Docker: supabase_db_vdbdigital2
Remote/linked: NO

CHECKOUT_ENABLED=
P05_MIGRATION_APPLIED=

Migration: 20260719160000_invoices_financial_documents.sql
sha256:

npm run db:verify-invoices-financial →
npm run db:verify-quotes-acceptance →
npm run db:verify-documents-storage →
npm run db:verify-project-management →
npm run db:verify-auth-portal →
npm run catalog:verify-no-tawk →

lint / typecheck / test / access-control / build →

Confirm:
- [ ] No remote migration
- [ ] No Mollie
- [ ] No pay button in portal
- [ ] Manual payment ≠ provider payment
- [ ] Quote accept ≠ auto invoice
- [ ] No Tawk
- [ ] Evidence not committed
```
