# vdb-backend-contract@0.2.0-rc.4

## schemaVersion

`2026.07.29.admin-control-surface-rc4`

## Summary

Additive **admin control surface** for Mobile device remediation on top of rc.3 messaging/support/appointments.

### New RPCs

- `admin_dashboard_stats`
- `admin_work_queue`
- `approve_partner_commission` / `reject_partner_commission` (OWNER/ADMIN + AAL2)
- `suspend_partner` / `reactivate_partner` (OWNER/ADMIN + AAL2)
- Directory: `admin_list_products|partners|customers|projects|quotes|invoices|appointments`
- `admin_get_settings_summary` / `admin_get_security_status`
- `verify_admin_control_surface_contracts`

### Contract drift

- Canonical: `transition_portal_support_ticket_status`
- Deprecated alias: `transition_portal_support_ticket`

### Financial behavior change

- `confirm_partner_sale` now creates commission `PENDING` and does **not** post ledger.
- `approve_partner_commission` posts `COMMISSION_ACCRUAL`.
- Enum: `partner_commission_status` gains `REJECTED`.

### Explicitly NOT activated for Mobile

- Payout approve / reject / process / paid mutations.

## Pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.4
```

## Staging

Authorized for staging apply after local verify. **Production not authorized.**
