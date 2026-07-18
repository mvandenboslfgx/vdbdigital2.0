# Auth & Portal — Operator Guide

## Daily

1. Invite customers from `/admin/customers` or `/admin/customers/new` (invitation-first).
2. Staff use `/inloggen` → `/admin` (MFA/AAL2 for OWNER/ADMIN as configured).
3. Customers use invite link → `/portal`.

## Verify local foundation

```bash
npm run db:verify-auth-portal
```

Expect: `RESULT: PASS`

## Do not

- Enable checkout
- Apply portal migrations to remote/production from this workflow
- Trust client-side roles
- Reintroduce Tawk.to
- Send real invite emails until Resend/from-address is production-ready
