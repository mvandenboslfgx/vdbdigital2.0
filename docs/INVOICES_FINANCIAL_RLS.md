# Invoices Financial RLS

Tables: `portal_invoices`, `portal_invoice_items`, `portal_invoice_versions`, `portal_invoice_payment_records`.

| Actor | Access |
|-------|--------|
| anon | Deny |
| Customer | Own org; customer-visible statuses only; no drafts |
| Staff | Via `is_staff_admin` / service-role after permissions |
| Payment records | Staff select only (internal notes) |

Mutations: server actions + SECURITY DEFINER RPCs (`issue_portal_invoice`, `record_portal_invoice_payment`) with fixed `search_path`, no PUBLIC/anon execute.
