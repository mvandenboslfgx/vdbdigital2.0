# HTTP Mutation Routes

Inventarisatie van **werkelijke** HTTP-mutaties in VDB Digital (juli 2026).

## Next.js Server Actions — requestgedrag

Formulieren en client-aangeroepen actions sturen een **POST naar de pagina-URL** waar de action staat geregistreerd, met o.a.:

- Header `Next-Action`
- Body: `multipart/form-data` of `text/plain`

Er zijn **geen** aparte REST-endpoints zoals `/api/contact`. WAF-regels moeten daarom de **paginapaden** matchen, niet conceptuele API-paden.

## Mutatietabel

| Functie | Werkelijke methode | Werkelijk pad | Implementatie | Publiek/authenticated |
| --- | --- | --- | --- | --- |
| Contactformulier | POST | `/contact` | Server Action `submitContactAction` op contactpagina | Publiek |
| Offerteformulier | POST | `/quote` | Server Action `submitQuoteAction` | Publiek |
| Supportformulier | POST | `/support` | Server Action `submitSupportAction` | Publiek |
| Checkout / Mollie payment create | POST | `/checkout` | Server Action `submitCheckoutAction` → `createMolliePayment` | Publiek |
| Winkelwagen — product toevoegen | POST | `/shop/{slug}` (huidige productpagina) | Server Action `addToCartAction` via `startTransition` | Publiek |
| Winkelwagen — verwijderen/aantal | POST | `/cart` | Server Action `removeFromCartAction` / `updateQuantityAction` | Publiek |
| Mollie webhook | POST | `/api/webhooks/mollie` | Route Handler `route.ts` | Server-to-server (Mollie) |

## Geen mutatie (nog)

| Functie | Opmerking |
| --- | --- |
| Admin login | `/admin/login` is alleen informatief — **geen** loginformulier of POST-handler |
| Admin CRUD | Geen Server Actions in `src/app/admin/` |
| Downloads | Geen download-mutatieroutes |

## Code-referentie

Single source of truth: `src/config/waf-routes.ts`

| Bestand | Mutaties |
| --- | --- |
| `src/server/actions/form-actions.ts` | contact, offerte, support |
| `src/server/actions/checkout-actions.ts` | checkout |
| `src/server/actions/cart-actions.ts` | winkelwagen / shop |
| `src/app/api/webhooks/mollie/route.ts` | Mollie webhook |

## WAF-implicaties

- **Hobby:** één gecombineerde rate-limitregel voor publieke POST-mutaties (webhook **uitgesloten**).
- **Pro:** aparte regels per formulier/checkout mogelijk (max. 10 min fixed window).
- **Mollie:** `/api/webhooks/mollie` nooit in blokkerende publieke groep; alleen optioneel Log Mode.

Zie [VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md).
