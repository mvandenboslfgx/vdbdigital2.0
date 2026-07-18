# Architectuur

## Stack

- **Next.js 16** (App Router, React Server Components)
- **TypeScript** (strict)
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL, Auth, RLS)
- **Mollie** (Hosted Checkout)
- **Resend** (transactionele e-mail)
- **Upstash Redis** (rate limiting, optioneel)

## Lagen

```
Client Components → Server Actions → Services → Repositories → Supabase
                                  ↘ Seed fallback (dev)
```

## Belangrijke principes

1. **Prijzen altijd server-side** — nooit client/localStorage vertrouwen
2. **Betalingen via Mollie Hosted Checkout** — geen kaartgegevens op server
3. **Webhook als bron van waarheid** — return URL is alleen UI
4. **Admin autorisatie server-side** — RBAC per actie
5. **RLS deny-by-default** — service role alleen server-side
6. **Consent vóór tracking** — geen externe livechat-widgets; analytics/marketing alleen na toestemming

## Route groups

- `(marketing)` — publieke pagina's
- `(shop)` — shop, winkelwagen, checkout
- `(legal)` — juridische pagina's
- `admin/(protected)` — beveiligd adminpaneel

## Fallback zonder Supabase

Wanneer Supabase niet is geconfigureerd, gebruikt het platform seed data uit `src/config/products.seed.ts` en in-memory order storage voor ontwikkeling.
