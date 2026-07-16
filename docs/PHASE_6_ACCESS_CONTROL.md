# Phase 6 — Zero-Trust Access Control

**Eindstatus:** `ACCESS CONTROL GEHARDEND — GEREED VOOR BESCHERMDE PREVIEW`

## Geïmplementeerd

### Centrale auth-laag (`src/server/auth/`)

- `require-session.ts` — server-side sessie
- `require-admin.ts` — rol uit DB + is_active
- `require-permission.ts` — expliciete permissions
- `require-aal2.ts` — MFA AAL2 enforcement
- `authorize-resource.ts` — object-level + mass-assignment preventie
- `mfa-status.ts` — Supabase MFA status

### MFA (Supabase TOTP)

- `/admin/mfa/setup` — enrollment
- `/admin/mfa/verify` — AAL2 verificatie
- `/admin/login` — email/wachtwoord login
- Alle adminpagina's vereisen AAL2

### RBAC

Expliciete permissions in `src/lib/auth/permissions.ts` — gekoppeld aan OWNER/ADMIN/SUPPORT/CONTENT.

### RLS migration

`supabase/migrations/20260715000000_phase6_access_control.sql`

- `profiles.is_active`
- Authenticated read own `admin_roles`
- Deny authenticated op orders, payments, leads, audit_logs, etc.

### Tests

```powershell
npm run test:access-control
npm run test:security
```

## Handmatig vereist

### Supabase

1. Migration deployen: `supabase db push` of MCP migrate
2. Publieke signup beperken (geen open admin-registratie)

### MFA (Supabase TOTP)

Supabase TOTP MFA is standaard beschikbaar via de Auth API — geen aparte dashboard-enable-stap vereist.

Flow:

1. Admin login via `/admin/login`
2. Eerste login → redirect naar `/admin/mfa/setup`
3. Enrollment: `mfa.enroll` → `mfa.challenge` → `mfa.verify`
4. Volgende logins → `/admin/mfa/verify` tot AAL2 actief
5. Zonder geverifieerde factor: admin geblokkeerd
6. Alle adminpagina's en `guardedAdminPingAction` vereisen AAL2

### Vercel

1. Deployment Protection + Vercel Authentication voor Preview
2. WAF-regels (Phase 5)

## Documentatie

- [ADMIN_ACCESS_MATRIX.md](./ADMIN_ACCESS_MATRIX.md)
- [ACCESS_CONTROL_TEST_MATRIX.md](./ACCESS_CONTROL_TEST_MATRIX.md)
- [SECRET_KEY_USAGE.md](./SECRET_KEY_USAGE.md)

## Defense in depth

Geen securityclaims zonder bewijs. Adviseer onafhankelijke penetratietest vóór Production.
