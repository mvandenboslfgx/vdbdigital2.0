# Quotes & Acceptance Security

## Boundaries

- `CHECKOUT_ENABLED=false` — no checkout path from quotes
- No Mollie calls from quote send/accept/decline
- No payment or invoice records created on acceptance
- Prices never trusted from the client; server recalculates
- No public permanent PDF URLs; use short-lived signed downloads when a document exists
- Acceptance labeled **Digitale offerteacceptatie**, not qualified e-sign

## Identity & tenancy

- Actor = `auth.uid()` only
- Organization taken from membership / quote row — never from client body alone
- Customer sees only own active org quotes in customer-visible statuses
- Staff mutations behind `requireAdmin` + `quotes.*` permissions
- Sensitive staff ops may require AAL2 where marked in permissions

## Accept / decline RPCs

`accept_portal_quote` / `decline_portal_quote`:

- `SECURITY DEFINER` with fixed `search_path`
- No `PUBLIC` / `anon` execute
- Re-check membership, customer role, status, expiry, version
- Idempotent identical re-accept; conflicting second actor fails clearly

## XSS / CSRF

- Descriptions rendered safely in UI; sanitize if HTML ever allowed
- Server actions use origin verification + rate limits

## What we do not claim

- No malware scan of quote attachments beyond documents foundation
- No legal “wet signature” equivalence
