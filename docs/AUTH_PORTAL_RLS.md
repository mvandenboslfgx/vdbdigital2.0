# Auth & Portal — RLS

## Enabled on (portal foundation)

organizations, organization_members, organization_invitations, organization_internal_notes, portal_* tables, related storage.

## Principles

- `anon`: deny
- Customer: only orgs with ACTIVE membership (`is_org_member`)
- Internal notes: staff only
- Staff: via `is_staff_admin()` / controlled policies
- Service role: server-side only; never browser

## Verifier

`verify_auth_portal_foundation_contracts()` (alias of `portal_verify_customer_contracts`) — service_role execute only.

See also: `docs/CUSTOMER_PORTAL_SECURITY.md`.
