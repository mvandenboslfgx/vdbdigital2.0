# Admin RPC schema stamps — RC6 formal migration

```text
Migration: 20260729145145_admin_rpc_schema_stamps_rc6.sql
Staging:   qzekuvmgfekzsowdecyk
Tip:       20260729145145
schemaVersion literal: 2026.07.29.partner-approval-aal2-rc6
Production: nhsrdnjfsxfikfbdmdfj untouched
```

## Scope

Forward-only `pg_get_functiondef` + literal replace of RC4/RC5 `schema_version`
stamps to RC6 for Mobile-consumed admin/directory/checklist read RPCs.

Signatures, output shapes, grants, SECURITY DEFINER, and search_path preserved.
No AAL2 introduced on read RPCs.

## Live staging stamps (post-apply)

All of the following are **rc6**:

- admin_dashboard_stats, admin_work_queue
- admin_get_settings_summary, admin_get_security_status
- admin_get_product/partner/customer/project/quote/invoice/appointment
- admin_list_partners/products/customers/projects/quotes/invoices/appointments
- partner_activation_checklist
- list_portal_support_ticket_replies

Verifier: `verify_admin_rpc_schema_stamps_rc6()` — zero failing rows.

Temporary RC4→RC5 staging bump scripts are **not** the source of truth; this migration is.
