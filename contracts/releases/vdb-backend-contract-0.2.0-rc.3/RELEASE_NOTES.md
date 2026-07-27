# vdb-backend-contract@0.2.0-rc.3

Messaging, support, and appointments delta on top of mobile-compat `0.2.0-rc.2`.

## schemaVersion

`2026.07.25.messaging-support-appointments-rc3`

## Includes (additive)

- All rc.2 partner + portal + feature_flags surfaces (unchanged names)
- Conversation type/moderation/soft-delete + participant hardening
- `portal_message_attachments`
- Support ticket status `NEW` (default) + assignment/reply/transition RPCs
- Mobile mapping: `support_messages` → `portal_support_replies` (no parallel table)
- `portal_appointments` + `portal_appointment_participants` + book/reschedule/cancel RPCs
- Fail-closed flags: `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking`
- `verify_messaging_support_appointments_contracts()`

## Breaking-for-clients (security-correct)

Org-wide conversation/message SELECT without a participant row no longer works. Clients must ensure participant rows.

## Explicitly NOT published as canonical

- Owner historical freeze `0.1.0`
- Mobile local proposal `0.1.1`

## Still deferred

- Mobile admin work-queue / dashboard stats
- Document upload/scan helper RPCs
- Marketing assets / partner reviews

## Not authorized

- Staging project creation
- Remote migration apply
- Production apply
- Package registry publish
- Enabling fail-closed flags without owner ops

## Consumers must pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
Map: support_messages → portal_support_replies
```
