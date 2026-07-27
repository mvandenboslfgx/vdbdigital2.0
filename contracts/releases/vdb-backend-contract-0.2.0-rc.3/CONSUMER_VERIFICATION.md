# Consumer verification — vdb-backend-contract@0.2.0-rc.3

## Pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
```

## Required client mappings

| Mobile / client name | Owner object |
| --- | --- |
| conversations | portal_conversations |
| messages | portal_messages |
| support_tickets / tickets | portal_support_tickets |
| support_messages | portal_support_replies |
| appointments | portal_appointments |

## Owner verify (local)

```bash
npm run db:verify-messaging-support-appointments
```

Asserts objects, columns, RLS, RPCs, fail-closed flags, and rc.2 surfaces (`portal_projects`, quotes, invoices, files, `partner_commissions`).

## Remove client stubs

After pin: remove `CONTRACT_SURFACE_UNAVAILABLE` for conversations/messages/support/appointments.

## Staging

Do **not** apply until owner staging rollout is explicitly authorized. This RC is local-first.
