# Case Approval Workflow

## Case types

| Type | Label (public) | Example |
|---|---|---|
| `real` | Client case | Vermeulen Bouwservice |
| `internal` | Internal / platform | VDB Digital Platform |
| `demonstration` | Demonstration / Demonstratie | WhatsApp AI, webshop, review flow demos |

## Status flow

```
DRAFT → AWAITING_CLIENT_APPROVAL → APPROVED → PUBLISHED → ARCHIVED
```

Public site renders only cases where:

- `status` is `PUBLISHED` or `APPROVED` (with `publicVisible: true`)
- Required permissions are confirmed for real client cases
- No unverified metrics or testimonials

## Permission fields

Defined on `CasePermissions` in `src/config/commercial/cases.ts`:

- `permissionConfirmed`
- `screenshotPermission`
- `logoPermission`
- `testimonialPermission`
- `metricsVerified`
- `clientApprovalDate`

## Admin (target)

Case management UI should support:

- Case type and status
- Permission checklist
- Content completeness indicator
- Publish / unpublish with audit log

**Current:** Case catalog is config-driven; full admin CRUD is a follow-up task.

## Demonstrations

Must always show **Demonstration** / **Demonstratie** badge. Never present as real client work.
