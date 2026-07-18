# Customer Portal Security

## Boundaries

- CHECKOUT_ENABLED=false — quote accept does not start payment
- No Mollie from portal/admin invoice/quote flows
- Geen externe livechatwidget actief
- No service-role key in browser
- No authz only in client components
- Invitation tokens stored as SHA-256 hashes; single-use; expiry
- Generic login errors (no user enumeration)
- Rate limits on login, reset, magic link, invite, account request
- Open redirects blocked (`isSafeInternalPath`)
- Internal notes never exposed to portal queries
- Private storage buckets; signed URLs only after server authz (uploads via service role path)

## Tenant isolation

Customers see only rows where `is_org_member(organization_id)` (and visibility flags). Cross-org ID guessing fails closed.
