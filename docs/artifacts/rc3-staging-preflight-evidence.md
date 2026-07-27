# RC.3 staging preflight evidence

**Status:** `OWNER CONTRACT RC.3 — STAGING PREFLIGHT PASS — APPLY NOT AUTHORIZED`  
**Date:** 2026-07-25  
**Target:** `qzekuvmgfekzsowdecyk` (linked CLI ref verified before queries)  
**Method:** `npx supabase db query --linked` (read-only SELECTs) + `supabase migration list --linked`  
**Apply:** **NOT EXECUTED**  
**Production `nhsrdnjfsxfikfbdmdfj`:** not queried for preflight  

## Pass criteria

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| Linked ref | `qzekuvmgfekzsowdecyk` | `qzekuvmgfekzsowdecyk` | PASS |
| Highest remote migration | ≥ `20260724160000` | `20260724160000` | PASS |
| RC.3 versions on remote | 0 | `rc3_applied_count = 0` | PASS |
| Baseline portal/partner/flags | all true | all true | PASS |
| RC.3 tables/RPC | all false | all false | PASS |
| `ticket_status_has_new` | false | false | PASS |
| Checkout release gate | exit 2 | exit 2 | PASS |

## Baseline objects (all present)

`portal_conversations`, `portal_messages`, `portal_support_tickets`, `portal_support_replies`, `portal_projects`, `portal_quotes`, `portal_invoices`, `portal_files`, `partner_commissions`, `feature_flags`

## RC.3 objects (all absent — ready for forward apply)

`portal_message_attachments`, `portal_appointments`, `portal_appointment_participants`, `verify_messaging_support_appointments_contracts()`

## Migration list tip (remote)

Highest remote: `20260724160000` (`mobile_compat_rc2`).  
Local-only (not on remote): `20260725120000` … `20260725120300`.

## Explicit non-actions after this PASS

- No staging apply until **separate explicit authorization**
- No Mobile / Partner pin
- No preview build
- No production write
- Checkout remains fail-closed

## Next status after owner authorize apply (not now)

Apply exact files in `docs/artifacts/rc3-apply-manifest.md`, then verify.
