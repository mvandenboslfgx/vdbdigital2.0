# Database

## Supabase PostgreSQL

Schema: `supabase/migrations/` (initial, phase2 RLS, phase3 concept-RLS)

## Tabellen

- `profiles`, `admin_roles` — gebruikers en RBAC
- `categories`, `products`, `product_features`, `product_faqs`
- `carts`, `cart_items`
- `customers`, `orders`, `order_items`, `payments`
- `leads`, `quote_requests`, `contact_submissions`
- `case_studies`
- `audit_logs`, `webhook_events`
- `site_settings`, `consent_records`

## RLS

Deny-by-default. Publieke read policies voor gepubliceerde **niet-concept** producten en categorieën. Admin mutaties via service role server-side.

## Scripts

| Commando | Beschrijving |
|----------|-------------|
| `npm run env:validate` | Controleert env-keys (geen waarden) |
| `npm run db:seed` | Idempotente seed (DRAFT + is_concept) |
| `npm run db:verify` | Schema- en dataverificatie |
| `npm run db:test-rls` | Live anon/publishable RLS-tests |
| `npm run db:bootstrap-owner` | Eenmalige OWNER bootstrap |

## Setup

Zie [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
