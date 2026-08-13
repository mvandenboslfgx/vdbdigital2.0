# Contract drift resolution — support ticket transition RPC

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Date:** 2026-07-29

## Observed drift

| Source | Name |
| --- | --- |
| Mobile `OWNER_RPCS.transitionSupportTicket` / `RC3_OWNER_RPCS` | `transition_portal_support_ticket_status` |
| Mobile `contracts/backend-contract.json` `required` + mapping | `transition_portal_support_ticket` |
| Owner migration `20260725120100_messaging_support_appointments_rc3_rpcs.sql` | `transition_portal_support_ticket_status` |
| Owner rc.3 `rpcs.json` customerPortalRpcs + mobileClientRpcMapping | `transition_portal_support_ticket_status` |
| Owner RLS/RPC tests | `transition_portal_support_ticket_status` |
| Staging applied surface | same as Owner migrations (rc.3 applied) |

## Canonical choice

**Canonical name:** `transition_portal_support_ticket_status`

### Rationale (evidence, not guess)

1. Owner SQL `CREATE OR REPLACE FUNCTION` and grants use `_status`.
2. Owner published/local contract bundle rc.3 lists `_status`.
3. Staging migration history includes the rc.3 RPC migration that defines `_status`.
4. Mobile runtime mapper already calls `_status`; the Mobile `backend-contract.json` required list is the stale short name.

## Compatibility

- **No Owner rename.**
- **Optional temporary alias** `transition_portal_support_ticket` → thin wrapper calling the canonical function (same args/return), documented deprecated, shared body (no duplicated business logic).
- Deprecation note: Mobile must pin to `transition_portal_support_ticket_status` under `vdb-backend-contract@0.2.0-rc.4`; alias retained through rc.4 for any stale client contract lists, removable in a later gated cleanup.

## Tests

- Canonical path exercised by existing messaging RLS/RPC suite + rc.4 verify.
- Alias path: callable, returns identical transition result, writes same audit action.

## Mobile action (out of scope for Owner agent)

Update Mobile `contracts/backend-contract.json` required/mapping from `transition_portal_support_ticket` → `transition_portal_support_ticket_status` when consuming rc.4.
