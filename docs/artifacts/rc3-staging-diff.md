# RC.3 staging diff (apply NOT authorized)

**From:** RC2 freeze tip `20260724190000` (42 migrations; staging already applied)  
**To:** RC3 tip `20260725120300` (46 migrations local)  
**Contract:** `vdb-backend-contract@0.2.0-rc.3` / `2026.07.25.messaging-support-appointments-rc3`

## Apply order (additive, no destructive reset)

| # | Version | File | SHA256 |
| --- | --- | --- | --- |
| 1 | `20260725120000` | `20260725120000_messaging_support_appointments_rc3.sql` | `2a7bda8f49310bf1a24a73d227e984fe12d701f4c6b6394171d10ec91de88fc9` |
| 2 | `20260725120100` | `20260725120100_messaging_support_appointments_rc3_rpcs.sql` | `364f4c4e27674e4052aa092b260b05f872cfc962a46bf072326d4aabd10cab65` |
| 3 | `20260725120200` | `20260725120200_fix_appointment_rls_recursion.sql` | `37aa246f07bf4100ece20d12b425c85dd1ddb96cf76d720be2e96a52bd47968b` |
| 4 | `20260725120300` | `20260725120300_rc3_table_grants.sql` | `786919a0b3267c5eb8ed2ef1073e7c9916063593c168d77ba933891fd727ed00` |

**Prerequisite:** staging tip ≥ `20260724190000`. Do not squash; enum `NEW` then default in separate migrations.

## New / changed objects

**New tables:** `portal_message_attachments`, `portal_appointments`, `portal_appointment_participants`  
**Hardened:** `portal_conversations`, `portal_conversation_participants`, `portal_messages`, `portal_support_tickets`, `portal_support_replies`  
**RPCs:** `create_portal_conversation`, `manage_portal_conversation_participant`, `send_portal_message`, `mark_portal_conversation_read`, `assign_portal_support_ticket`, `reply_portal_support_ticket`, `add_portal_support_internal_note`, `transition_portal_support_ticket_status`, `book_portal_appointment`, `reschedule_portal_appointment`, `cancel_portal_appointment`, `verify_messaging_support_appointments_contracts`  
**Flags (default false):** `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking`  
**RLS:** participant-scoped conversation access (behavioural tighten vs org-wide select)  
**Storage:** attachment metadata table; buckets remain private (support-attachments already)  
**Realtime:** gated fail-closed (flag off)

## Destructive / data-dependent

| Item | Assessment |
| --- | --- |
| Enum `portal_ticket_status.NEW` | Additive; rollback cannot drop enum safely — **forward-fix only** |
| Participant RLS tighten | Org members without participant rows lose conversation SELECT — **data-dependent**; ensure participant rows before enable |
| `db reset` | **Forbidden** on staging |

## Rollback

1. Leave flags `false`.  
2. `REVOKE EXECUTE` on mutation RPCs if needed.  
3. Do not DROP tables.  
4. Do not `db reset`.

## Fixtures

Reuse staging synthetic users (`staging+*@example.test`) + add conversation/ticket/appointment fixtures after apply under marker `STAGING_RC3_*`.

## Post-apply verify

```sql
SELECT check_name, ok, detail
FROM public.verify_messaging_support_appointments_contracts()
WHERE ok IS NOT TRUE;
```

```bash
npm run db:verify-messaging-support-appointments
npm run test:messaging-support-appointments-rls
npm run db:verify-partner-backend
npm run db:verify-customer-portal
npm run db:verify-invoices-financial
npm run db:verify-quotes-acceptance
```

## Client pins (after staging verify — separate gate)

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
Map: support_messages → portal_support_replies
```
