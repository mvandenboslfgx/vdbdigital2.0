# Auth Portal Foundation — Migration Evidence Template

Fill after **local-only** apply. Store under `docs/evidence/` (gitignored).

## Environment

- Date:
- Operator:
- Target host: `127.0.0.1` / `localhost` (confirm)
- Project id (local):
- `CHECKOUT_ENABLED`: false
- `P05_MIGRATION_APPLIED`: unset

## Migrations applied (local)

- [ ] `20260717000000_customer_portal.sql`
- [ ] `20260718120000_auth_portal_foundation_verify.sql`

## Commands

```text
npm run db:verify-auth-portal
```

Paste PASS output:

```text

```

## Confirmations

- [ ] No remote / production apply
- [ ] No Mollie live payment
- [ ] No Tawk.to added
- [ ] Service-role not in browser bundle
- [ ] Anon cannot execute verifier RPC
