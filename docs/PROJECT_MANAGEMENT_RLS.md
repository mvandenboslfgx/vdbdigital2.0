# Project Management RLS

## Principles

- `anon`: no SELECT/INSERT/UPDATE/DELETE on project tables
- Customers: active `is_org_member(organization_id)` + `customer_visible` + not archived
- Child rows: additional `customer_visible` / activity `CUSTOMER_VISIBLE` / feedback `CUSTOMER_SHARED`
- Staff writes: **service role** after `requireAdmin` + `requirePermission` (app layer)
- Helpers: `is_org_member`, `is_staff_admin` (SECURITY DEFINER, fixed `search_path`)

## Key policies

- `portal_projects_member_select`
- `portal_project_actions_member_select` (customer actions only)
- `portal_project_activity_member_select`
- `portal_feedback_member` / `_insert`
- `portal_project_members_select` (staff only via `is_staff_admin`)

## Verification

```bash
npm run db:verify-project-management
```

RPC: `verify_project_management_contracts()` — fail-closed, local Docker preferred.
