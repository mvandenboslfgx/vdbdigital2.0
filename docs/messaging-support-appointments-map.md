# Messaging / Support / Appointments — owner map (rc.3)

**Contract:** `vdb-backend-contract@0.2.0-rc.3`  
**schemaVersion:** `2026.07.25.messaging-support-appointments-rc3`

## Conversations

| Field | Value |
| --- | --- |
| Table | `portal_conversations` |
| PK | `id` UUID |
| FKs | `organization_id` → `organizations`, `project_id` → `portal_projects` (nullable), `partner_id` → `partner_profiles` (nullable) |
| Type enum | `portal_conversation_type`: `PROJECT \| SUPPORT \| PARTNER \| INTERNAL` |
| Soft delete | `deleted_at`, `moderation_status` |
| Actions | create via `create_portal_conversation`; participants via `manage_portal_conversation_participant` |
| Roles | staff: all types; customer/partner: non-INTERNAL only as participant |
| RLS | SELECT/INSERT for active participants; INTERNAL staff-only |
| Realtime | gated by feature flag `messaging_realtime` (default false) |
| Empty response | `[]` / null conversation |
| Errors | `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_PARTICIPANT`, `VALIDATION_FAILED` |

## Participants

| Field | Value |
| --- | --- |
| Table | `portal_conversation_participants` |
| Unique | `(conversation_id, user_id)` |
| Columns | `role_in_conversation`, `last_read_at`, `removed_at` |
| Mark read | `mark_portal_conversation_read` — only `user_id = auth.uid()` |
| Errors | `NOT_PARTICIPANT`, `FORBIDDEN` |

## Messages

| Field | Value |
| --- | --- |
| Table | `portal_messages` |
| Soft delete | `deleted_at` |
| Idempotency | unique `(conversation_id, idempotency_key)` when key present |
| Client id | `client_message_id` (nullable) |
| Internal | `is_internal` — never SELECT for customer/partner |
| Send | `send_portal_message` |
| Errors | `NOT_PARTICIPANT`, `IDEMPOTENCY_CONFLICT`, `INTERNAL_LEAK_DENIED`, `FORBIDDEN` |

## Message attachments

| Field | Value |
| --- | --- |
| Table | `portal_message_attachments` (new) |
| FK | `message_id` → `portal_messages` |
| Storage | `storage_path` / `file_name` / `mime_type` / `byte_size` |
| RLS | via message → conversation active participation |

## Support tickets

| Field | Value |
| --- | --- |
| Table | `portal_support_tickets` |
| Status enum | `NEW \| OPEN \| IN_PROGRESS \| WAITING_FOR_CUSTOMER \| WAITING_FOR_VDB \| RESOLVED \| CLOSED` |
| Default | `NEW` |
| Mobile aliases | `new`→`NEW`, `open`→`OPEN`, `in_progress`→`IN_PROGRESS`, `waiting`/`waiting_customer`→`WAITING_FOR_CUSTOMER`, `waiting_vdb`→`WAITING_FOR_VDB`, `resolved`→`RESOLVED`, `closed`→`CLOSED` |
| Assignee | `assigned_to` via `assign_portal_support_ticket` (staff) |
| Transitions | `transition_portal_support_ticket_status` |
| Errors | `INVALID_TRANSITION`, `FORBIDDEN`, `NOT_FOUND` |

## Support messages (Mobile name)

| Field | Value |
| --- | --- |
| Owner table | `portal_support_replies` |
| Mapping | Mobile `support_messages` → `portal_support_replies` |
| Public reply | `reply_portal_support_ticket` (`is_internal=false`) |
| Internal note | `add_portal_support_internal_note` (staff, `is_internal=true`) |
| Customer SELECT | `is_internal = false` only |
| Errors | `INTERNAL_LEAK_DENIED`, `FORBIDDEN` |

## Appointments

| Field | Value |
| --- | --- |
| Tables | `portal_appointments`, `portal_appointment_participants` |
| Type enum | `portal_appointment_type` |
| Status enum | `SCHEDULED \| CONFIRMED \| RESCHEDULED \| CANCELLED \| COMPLETED \| NO_SHOW` |
| Book | `book_portal_appointment` (transactional overlap check) |
| Reschedule | `reschedule_portal_appointment` |
| Cancel | `cancel_portal_appointment` |
| Overlap | organizer active appointments — error `DOUBLE_BOOKING` |
| Flag | `appointments_booking` (default false) |
| Errors | `DOUBLE_BOOKING`, `FORBIDDEN`, `INVALID_TRANSITION`, `FEATURE_DISABLED` |

## Feature flags (fail-closed)

| Key | Default |
| --- | --- |
| `messaging_realtime` | false |
| `support_internal_notes_rpc` | false |
| `appointments_booking` | false |

## Verifier

`verify_messaging_support_appointments_contracts()` — objects, columns, RLS, RPCs, rc.2 surfaces intact.

## Mobile handoff (after local PASS)

```text
Pin: VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
     VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
Map: support_messages → portal_support_replies
Remove CONTRACT_SURFACE_UNAVAILABLE for conversations/messages/support/appointments
```

## Breaking note

Participant-hardening: org members who previously could SELECT all org conversations **without** a participant row will lose that access. Clients must ensure participant rows exist.
