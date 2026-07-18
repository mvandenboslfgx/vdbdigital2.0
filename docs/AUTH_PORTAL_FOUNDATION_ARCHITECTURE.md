# Auth & Portal Foundation — Architecture

Baseline: commit `d2360e0` / tag `tawk-zero-reference-pass`.

## Purpose

Secure foundation for:

1. Internal VDB Digital admin (`/admin`)
2. Customer portal (`/portal`)
3. Future projects, quotes, files, invoices, messages, support

Invitation-first account model. No open public registration with portal access.

## Canonical auth routes (NL)

| Route | Role |
|-------|------|
| `/inloggen` | Password (+ magic link when configured) |
| `/wachtwoord-vergeten` | Anti-enumeration reset request |
| `/wachtwoord-herstellen` | Recovery session update |
| `/account-activeren` | Activation hub |
| `/uitnodiging/accepteren` | Invite accept (token + password) |
| `/auth/callback` | PKCE / email link exchange |
| `/uitloggen` | Sign-out |

## Post-login redirects

Server-side via `resolvePostLoginPath`:

- Staff (`admin_roles`) → `/admin` (via MFA when required)
- Active org member → `/portal`
- Blocked / no role → `/inloggen` fail-closed

`next` query is allowlisted (`isSafeInternalPath`) and audience-aware (`audienceSafeInternalPath`): staff never land on `/portal` via `next`; customers never land on `/admin` via `next`.

## Tenancy

- `organizations` + `organization_members` + `organization_invitations`
- Customer roles: `PRIMARY` | `MEMBER` | `BILLING` | `VIEW_ONLY`
- Staff roles: `OWNER` | `ADMIN` | `CONTENT` | `SUPPORT`
- Auth identity: `auth.uid()` only; never trust client `user_id` / `organization_id`

## Verification

```bash
npm run db:verify-auth-portal
```

Local Docker preferred. Requires forward-only migrations including `20260718120000_auth_portal_foundation_verify.sql`.

## Safety invariants

- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset
- No remote migration apply from this workflow
- No Tawk reintroduction
- Service-role keys server-only
