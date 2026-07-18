# Vercel WAF Rate Limiting

VDB Digital gebruikt **Vercel Firewall/WAF** als primaire rate-limitlaag in Preview en Production.

Applicatie-laag: Zod, honeypot, origincontrole, idempotency (zie [SECURITY.md](./SECURITY.md)). Dev in-memory limiter alleen lokaal.

**Status:** `VERCEL WAF CONFIGURATION REQUIRED` — configureer regels in Vercel Dashboard vóór openbare preview.

Werkelijke paden: [HTTP_MUTATION_ROUTES.md](./HTTP_MUTATION_ROUTES.md)

---

## Vercel-planbeperkingen

| Beperking | Hobby | Pro |
| --- | --- | --- |
| Rate-limitregels per project | **1** | Meerdere |
| Custom firewall rules | Max. **3** | Meer |
| Fixed window maximum | **10 minuten** | **10 minuten** |

Gebruik **geen** 15-minutenvensters. Gebruik **geen** fictieve paden zoals `/api/contact`.

---

## Uitsluitingen (altijd)

| Pad | Reden |
| --- | --- |
| `/api/webhooks/mollie` | Mollie server-to-server; nooit blokkeren via publieke mutation-regel |

Mollie-webhook beveiliging:

- Optionele query-param `secret` (geen IP-allowlist)
- Payment status opnieuw ophalen bij Mollie
- Idempotente verwerking (`webhook_events` unique constraint)
- HTTP 200 bij correct verwerkt of duplicate
- Geen dubbele mails/orders bij herhaling

---

## Hobby — één gecombineerde regel

**Naam:** `public-mutations-combined`

| Veld | Waarde |
| --- | --- |
| Plan | Hobby |
| Methode | POST |
| Pad | Zie conditie hieronder |
| Limiet | 40 requests |
| Venster | 10 minuten (fixed) |
| Mode | **Log** → daarna **429** |

**Conditie (Vercel Firewall):**

```
Method equals POST
AND Path is NOT /api/webhooks/mollie
AND (
  Path equals /contact
  OR Path equals /quote
  OR Path equals /support
  OR Path equals /checkout
  OR Path equals /cart
  OR Path starts with /shop/
)
```

Optioneel verfijnen met header `Next-Action` is aanwezig (Server Actions).

**Niet opnemen:** `/admin/login` (geen POST-handler), `/api/webhooks/mollie`.

---

## Pro — aparte regels (max. 10 min venster)

| Naam | Plan | Methode | Werkelijk pad | Limiet | Venster | Mode |
| --- | --- | --- | --- | ---: | ---: | --- |
| contact-form | Pro | POST | `/contact` | 5 | 10 min | Log → 429 |
| quote-form | Pro | POST | `/quote` | 3 | 10 min | Log → 429 |
| support-form | Pro | POST | `/support` | 10 | 10 min | Log → 429 |
| checkout-payment | Pro | POST | `/checkout` | 5 | 10 min | Log → 429 |
| cart-shop | Pro | POST | `/shop/*` | 30 | 10 min | Log → 429 |
| cart-basket | Pro | POST | `/cart` | 20 | 10 min | Log → 429 |

**Admin login:** geen regel — route heeft nog geen POST-mutatie.

**Mollie webhook (Pro, optioneel observatie):**

| Naam | Plan | Methode | Pad | Limiet | Venster | Mode |
| --- | --- | --- | --- | ---: | ---: | --- |
| mollie-webhook-observe | Pro | POST | `/api/webhooks/mollie` | 120 | 10 min | **Log only** |

Nooit **Block/429** op webhook tenzij extreme abuse na analyse.

---

## Regeltabel (samenvatting)

| Naam | Plan | Methode | Werkelijk pad | Limiet | Venster | Mode |
| --- | --- | --- | --- | ---: | ---: | --- |
| public-mutations-combined | Hobby | POST | `/contact`, `/quote`, `/support`, `/checkout`, `/cart`, `/shop/*` (webhook uitgesloten) | 40 | 10 min | Log → 429 |
| contact-form | Pro | POST | `/contact` | 5 | 10 min | Log → 429 |
| quote-form | Pro | POST | `/quote` | 3 | 10 min | Log → 429 |
| support-form | Pro | POST | `/support` | 10 | 10 min | Log → 429 |
| checkout-payment | Pro | POST | `/checkout` | 5 | 10 min | Log → 429 |
| cart-shop | Pro | POST | `/shop/*` | 30 | 10 min | Log → 429 |
| cart-basket | Pro | POST | `/cart` | 20 | 10 min | Log → 429 |
| mollie-webhook-observe | Pro | POST | `/api/webhooks/mollie` | 120 | 10 min | Log only |

---

## Veilige uitrolvolgorde

1. Preview deployen met **Deployment Protection** (Vercel).
2. WAF-regel(s) aanmaken in **Log Mode**.
3. Minimaal 10 minuten normaal testverkeer (formulieren, shop, checkout).
4. **Firewall → Observability** controleren op false positives.
5. Legitieme requests bevestigen (inclusief Mollie test-webhook).
6. Regel wijzigen naar **429 / Rate limit** (webhook blijft Log of uitgesloten).
7. Contact, offerte, support, checkout, winkelwagen opnieuw testen.
8. Mollie-webhook **afzonderlijk** testen (herhaalde delivery = één orderupdate).

---

## Verificatie

```powershell
npm run test -- tests/unit/waf-routes.test.ts
```

Code-referentie: `src/config/waf-routes.ts`, `src/lib/security/rate-limit.ts`

---

## Niet gebruikt

- Upstash Redis
- IP-allowlist voor Mollie
