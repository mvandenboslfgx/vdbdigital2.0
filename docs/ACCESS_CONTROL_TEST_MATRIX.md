# Access Control Test Matrix

Geautomatiseerde tests: `npm run test:access-control`

| # | Scenario | Verwacht | Test |
|---:|---|---|---|
| 1 | Bezoeker opent `/admin` | Redirect login | E2E + layout |
| 2 | Admin Server Action zonder sessie | 401/throw | bypass.test |
| 3 | POST adminroute zonder sessie | Redirect | layout |
| 4 | Authenticated user zonder rol | 403 | require-admin |
| 5 | Rol in clientdata | Genegeerd | authorize-resource |
| 6 | user_metadata rol | Niet gebruikt | static |
| 7 | Eigen rol wijzigen | 403 | FORBIDDEN_CLIENT_FIELDS |
| 8 | SUPPORT → OWNER actie | 403 | permissions.test |
| 9 | CONTENT → prijs wijzigen | 403 | permissions.test |
| 10 | ADMIN → OWNER verwijderen | 403 | permissions.test |
| 11 | AAL1 opent admin | Redirect MFA verify | require-aal2 |
| 12 | MFA ingeschreven, niet geverifieerd | Redirect verify | mfa layout |
| 13 | Verlopen sessie | 401 | require-session |
| 14 | Rol verwijderd, oude sessie | 403 | require-admin (DB lookup) |
| 15 | Gedeactiveerd account | 403 | is_active check |
| 16 | Object-ID andere order | 404 | authorize-resource |
| 17 | Gemanipuleerde order-ID | 404 | assertValidUuid |
| 18 | Gemanipuleerde prijs in payload | Genegeerd | checkout server-side |
| 19 | Extra velden (role, price_cents) | 403 | rejectForbiddenFields |
| 20 | GET op webhook | 405 | bypass.test |
| 21 | URL-encoded adminpath | Next.js routing | manual |
| 22 | Trailing slash | Next.js normalize | manual |
| 23 | Anon Supabase conceptproduct | Denied | db:test-rls |
| 24 | Anon order lezen | Denied | db:test-rls |
| 25 | Authenticated auditlog | Denied | migration + RLS |
| 26 | Secret key in client bundle | Absent | env:scan-secrets |
| 27 | Preview zonder Vercel Auth | BLOCKED | manual/Vercel |
| 28 | CSRF vreemde origin | Geweigerd | verifyOrigin |
| 29 | Dubbele Mollie webhook | Idempotent | webhook-idempotency |
| 30 | Bootstrap als web-route | Niet aanwezig | bypass.test |

## Externe penetratietest (handmatig)

- Live MFA enrollment flow
- Session fixation / cookie theft
- Brute-force login (WAF + Supabase rate limits)
- IDOR op toekomstige admin mutaties
- SSRF via webhook URL injection
- Vercel Deployment Protection bypass
