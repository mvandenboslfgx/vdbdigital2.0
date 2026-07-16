# Secret Key Usage Inventory

`SUPABASE_SECRET_KEY` omzeilt RLS. Gebruik alleen na authenticatie, authorization en businessvalidatie.

## Runtime (applicatie)

| Module | Functie | Waarom Secret key |
|---|---|---|
| `require-admin.ts` | `loadTrustedAdminRole` | Rol uit vertrouwde tabel na sessievalidatie |
| `admin-products.ts` | `getAdminProducts` | Admin leest DRAFT/concept — na AAL2 + permission |
| `products.ts` | Publieke catalogus | Anon RLS deny INSERT; server-side published filter |
| `form-actions.ts` | Form inserts | Anon INSERT denied op leads/contact/quote |
| `order-service.ts` | Orders + webhook | Checkout + idempotente webhookverwerking |
| `audit-log.ts` | `writeAuditLog` | Append-only audit; geen client write |
| `mollie/route.ts` | — | **Geen** Secret key (Mollie API + order-service) |

## Regels

1. **User session + RLS** waar mogelijk (publieke reads via anon client)
2. **Secret key** alleen voor:
   - Server-side mutaties na validatie
   - Admin reads na AAL2 + permission
   - Webhook/checkout systeemoperaties
   - Audit logging
3. **Nooit** in client components, middleware-only auth, of zonder authorization

## Scripts (CLI, lokaal)

| Script | Gebruik |
|---|---|
| `bootstrap-owner.ts` | OWNER toewijzing |
| `seed.ts` | Development seed |
| `verify-db.ts` | Verificatie |
| `verify-owner.ts` | OWNER check |
| `test-rls.ts` | RLS tests |

## Verwijderd / niet gebruikt

- Secret key in middleware voor auth-beslissingen
- Secret key voor normale authenticated user queries zonder admin guard
- Client-side `createAdminClient`

## Migratiepad

Vervang elevated reads door admin-RLS policies wanneer Supabase admin-RLS policies worden toegevoegd (toekomstig).
