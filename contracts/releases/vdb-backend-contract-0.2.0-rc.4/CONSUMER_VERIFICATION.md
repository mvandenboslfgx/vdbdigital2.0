# Consumer verification — vdb-backend-contract@0.2.0-rc.4

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.4
```

schemaVersion: `2026.07.29.admin-control-surface-rc4`

## Mobile must

1. Pin contract + schemaVersion above.
2. Allowlist new Owner RPCs (`admin_dashboard_stats`, `admin_work_queue`, commission review, partner lifecycle, directory, settings/security).
3. Map ticket status updates to `transition_portal_support_ticket_status` (not the short alias).
4. Keep payout mutation UI disabled.
5. Expect `AAL2_REQUIRED` / `FORBIDDEN` / `INVALID_TRANSITION` / `IDEMPOTENCY_CONFLICT` / `VALIDATION_FAILED` on mutations.
6. Replace `CONTRACT_SURFACE_UNAVAILABLE` throws for surfaces listed as implemented in the Owner Mobile handoff.

Owner does not modify the Mobile repository.
