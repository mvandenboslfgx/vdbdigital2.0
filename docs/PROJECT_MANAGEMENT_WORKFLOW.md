# Project Management Workflow

1. Admin creates project for **ACTIVE** organization → status DRAFT, visibility INTERNAL, unique `project_number`
2. Staff adds milestones / actions / deliverable metadata
3. Staff sets visibility to `CUSTOMER_VISIBLE` when ready (notification + activity)
4. Customer sees project in `/portal/projecten`
5. Customer completes allowed actions, approves/rejects SHARED deliverables, posts feedback
6. Activity + audit log capture events (no secrets / full bodies when id suffices)

## Deliverables

- DRAFT / IN_REVIEW = internal
- Share → SHARED + customer_visible
- Customer approve → APPROVED; reject requires reason → REJECTED
- File blobs deferred to document/storage phase

## Notifications

Uses existing `portal_notifications` when org has active members. Local tests skip real email (`email_status = SKIPPED`).
