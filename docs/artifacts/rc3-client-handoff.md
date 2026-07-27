# RC.3 client handoff (Mobile + Partner) — no client edits in this gate

## Shared pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
```

Staging apply of RC.3 is **not** authorized by the local freeze alone.

## Mobile

| Item | Value |
| --- | --- |
| Package | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Mapper | Keep `portal_*` / `partner_*`; map `support_messages` → `portal_support_replies` |
| Read receipts | `portal_conversation_participants.last_read_at` + `mark_portal_conversation_read` |
| Feature flags | `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking` default **false** |
| Staging env | `APP_ENV=staging`, URL `https://qzekuvmgfekzsowdecyk.supabase.co` |
| Still fail-closed until RC3 staging + pin | conversations/messages/support/appointments admin mutations if UI would call missing surfaces on rc.2 |
| After pin | Remove `CONTRACT_SURFACE_UNAVAILABLE` for promoted surfaces only when staging verify green |
| Test matrix | cust_a/b, part_a/b, staff, admin — positive + empty + forbidden |

## Partner

| Item | Value |
| --- | --- |
| Same contract | `0.2.0-rc.3` / same schemaVersion |
| Messaging/support | Shared `portal_*` — **no** parallel partner messaging tables |
| Financials | Unchanged rc.1/rc.2 partner ledger/commissions/payouts |
| Post-login routing | Must use owner identity (`partner_profiles` / shared roles), not local-only `user_roles`/`seller_profiles` |
| Tests | Partner leads/commissions isolation + PARTNER conversation membership |

## Explicit non-goals for clients in this gate

- No Mobile/Partner repo edits here  
- No preview APK  
- No parallel domains  
- No production pin
