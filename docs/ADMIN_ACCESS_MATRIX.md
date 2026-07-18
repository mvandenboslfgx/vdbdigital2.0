# Admin Access Matrix

Deny by default. Elke gevoelige operatie vereist server-side authorization.

Legenda: MFA = AAL2 verplicht | Obj = object-level controle | Audit = auditlog

## Adminpagina's

| Functie | Route | Vereiste rol | Permission | MFA | Obj | Audit |
|---|---|---|---|---|---|---|
| Login | `/admin/login` | — | — | — | — | login events |
| MFA setup | `/admin/mfa/setup` | admin* | — | AAL1 | — | mfa_enroll |
| MFA verify | `/admin/mfa/verify` | admin* | — | AAL1 | — | mfa_verify |
| Dashboard | `/admin` | CONTENT+ | — | AAL2 | — | — |
| Producten | `/admin/products` | CONTENT+ | `products.read` | AAL2 | — | — |
| Bestellingen | `/admin/orders` | SUPPORT+ | `orders.read` | AAL2 | — | — |
| Leads | `/admin/leads` | SUPPORT+ | `leads.read` | AAL2 | — | — |
| Cases | `/admin/cases` | CONTENT+ | `cases.manage` | AAL2 | — | — |
| Content | `/admin/content` | CONTENT+ | `content.manage` | AAL2 | — | — |
| Instellingen | `/admin/settings` | ADMIN+ | `settings.read` | AAL2 | — | — |
| Auditlog | `/admin/audit-log` | ADMIN+ | `audit.read` | AAL2 | — | — |

*admin = geldige rol in `admin_roles` + actief profiel

## Server Actions

| Functie | Actie | Publiek | Permission | MFA | Audit |
|---|---|---|---|---|---|
| Contactformulier | `submitContactAction` | Ja | — | — | — |
| Offerte | `submitQuoteAction` | Ja | — | — | — |
| Support | `submitSupportAction` | Ja | — | — | — |
| Checkout | `submitCheckoutAction` | Ja | — | — | order.created |
| Winkelwagen | `addToCartAction` etc. | Ja | — | — | — |
| Login | `loginAction` | Ja (origin) | — | — | login_success/failed |
| Logout | `logoutAction` | admin | — | AAL1+ | logout |
| MFA enroll | `mfaEnrollAction` | admin | — | AAL1 | mfa_enroll |
| MFA verify | `mfaVerifyEnrollAction` | admin | — | AAL1 | mfa_enroll_completed |
| MFA login verify | `mfaVerifyLoginAction` | admin | — | AAL1 | mfa_verify |
| Admin ping | `guardedAdminPingAction` | admin | implicit | AAL2 | — |

## Route Handlers

| Functie | Route | Methoden | Auth | MFA | Audit |
|---|---|---|---|---|---|
| Mollie webhook | `/api/webhooks/mollie` | POST | webhook secret (prod verplicht) | — | payment_status |
| Auth callback | `/auth/callback` | GET | OAuth code exchange | — | — |

## Repositories / services (elevated)

| Functie | Module | Secret key | Voorwaarden |
|---|---|---|---|
| Publieke producten | `products.ts` | Ja | Alleen PUBLISHED + !concept |
| Admin producten | `admin-products.ts` | Ja | requireAdmin + products.read + AAL2 |
| Orders | `order-service.ts` | Ja | Publieke checkout / webhook idempotent |
| Form inserts | `form-actions.ts` | Ja | Zod + honeypot + origin |
| Audit log | `audit-log.ts` | Ja | Server-only writer |
| Admin rol lookup | `require-admin.ts` | Ja | Na sessievalidatie |

## Scripts (lokaal only)

| Script | Secret key | Auth |
|---|---|---|
| `db:bootstrap-owner` | Ja | BOOTSTRAP_USER_* env, max 1 OWNER |
| `db:seed` | Ja | CLI only |
| `db:verify-owner` | Ja | CLI only |

## Bootstrap

Geen publieke web-route. Alleen `npm run db:bootstrap-owner` met bestaande Auth-user.
