# Owner contract surface audit — messaging, support, appointments

**Role:** `CANONICAL_BACKEND_OWNER` (vdbdigital2.0)  
**Date:** 2026-07-25  
**Baseline contract:** `vdb-backend-contract@0.2.0-rc.2`  
**Target contract:** `vdb-backend-contract@0.2.0-rc.3`  
**Remote apply:** not performed

## Classification matrix

| Logisch oppervlak | Runtime object | Classification | Evidence |
| --- | --- | --- | --- |
| conversations | `portal_conversations` | CANONICAL REUSE (+ hardening) | `20260717000000_customer_portal.sql` |
| conversation participants | `portal_conversation_participants` | CANONICAL REUSE (+ mark-read RPC/policy) | same |
| messages | `portal_messages` | CANONICAL REUSE (+ participant RLS, soft-delete) | same |
| message attachments | — | MISSING → `portal_message_attachments` | no table in migrations |
| support tickets | `portal_support_tickets` | CANONICAL REUSE (+ status `NEW`, assignment RPCs) | same |
| support messages | `portal_support_replies` | CANONICAL REUSE via mapping | Mobile name `support_messages` maps here; **no** second table |
| appointments | — | MISSING → `portal_appointments` | deferred in rc.2 `rpcs.json` |
| appointment participants | — | MISSING → `portal_appointment_participants` | none |
| availability/booking | external Cal.com env | LEGACY (non-DB) | `src/config/commercial/booking.ts` |
| marketing support leads | `leads` + `lead_type.SUPPORT` | LEGACY | not portal support |

## Existing RLS (pre-rc.3 gaps)

- Conversations/messages were readable by **any org member**, not only participants.
- `portal_conversation_participants` had SELECT only — no UPDATE for `last_read_at`.
- Internal messages/replies gated by `is_internal` + staff — keep and strengthen.
- No appointment RLS (tables absent).

## Deferred Mobile RPCs (rc.2) promoted in rc.3

From `contracts/releases/vdb-backend-contract-0.2.0-rc.2/rpcs.json` → `deferredMobileOnlyRpcs`:

- `book_appointment_slot` → owner `book_portal_appointment`
- `cancel_appointment` → owner `cancel_portal_appointment`
- `admin_reply_support_ticket` → owner `reply_portal_support_ticket` / `add_portal_support_internal_note`
- `admin_assign_ticket` → owner `assign_portal_support_ticket`
- `admin_update_ticket_status` → owner `transition_portal_support_ticket_status`

## Non-goals

- No parallel `conversations` / `messages` / `tickets` base tables.
- No rename of `portal_support_replies`.
- No remote/staging/production apply in this gate.
- Mobile/Partner repositories untouched.
