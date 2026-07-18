# Customer Portal — Roles & Permissions

## Staff roles (`admin_roles`)

| Role | Portal-related permissions (extra) |
|------|-------------------------------------|
| OWNER | All customer/project/quote/invoice/file/message/support + roles.manage |
| ADMIN | customers.*, organizations.manage, projects.*, quotes/invoices/files/messages/support |
| SUPPORT | customers.view, projects.view_all, messages.manage, support.manage, files.manage |
| CONTENT | No customer portal management |

Legal approvals remain OWNER + AAL2 (`products.legal_approve`).

## Customer roles (`organization_members.customer_role`)

PRIMARY · MEMBER · BILLING · VIEW_ONLY — scoped to own organization only.

## Fail-closed rules

- No admin access without `admin_roles` + active profile + AAL2
- No portal access without ACTIVE membership and non-blocked organization
- Staff hitting `/portal` → redirect `/admin`
- Customer hitting `/admin` → redirect `/portal`
- Client role claims are ignored; server loads roles via service role after session check
