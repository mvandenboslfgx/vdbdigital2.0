# Quotes & Acceptance RLS

## Tables

- `portal_quotes`
- `portal_quote_items`
- `portal_quote_versions`
- `portal_quote_acceptances`

## Principles

| Actor | Access |
|-------|--------|
| `anon` | Deny all |
| Customer (authenticated + membership) | Own org; statuses SENT/VIEWED/ACCEPTED/DECLINED/EXPIRED/WITHDRAWN only; no drafts |
| Staff | Via existing staff helpers / permissions — not a broad `authenticated` policy |
| `service_role` | Server actions only |

## Policies

- Customers select quotes filtered by `organization_id` membership helpers
- Items/versions readable when parent quote is customer-visible
- Mutations for customers go through RPC (`accept_portal_quote`, `decline_portal_quote`) or staff service-role after permission checks
- No policy that lets a customer update quote totals or status directly

## Grants

- Minimal execute on RPCs to `authenticated` (or authenticated role used by user JWT)
- Revoke from `PUBLIC` / `anon`
- Verification: `verify_quotes_acceptance_contracts`
