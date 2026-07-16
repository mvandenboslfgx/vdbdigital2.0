# Mollie Setup

## Webhookvariant

VDB Digital gebruikt de **klassieke Mollie Payments API-webhook** (geen Next-gen Webhooks).

| Aspect | Implementatie |
| --- | --- |
| Webhook URL | Per betaling via `webhookUrl` bij `payments.create` |
| Payload | `application/x-www-form-urlencoded` met payment-ID (`id`) |
| Status | Altijd opgehaald via `mollie.payments.get(paymentId)` |
| Signature | **Geen** `X-Mollie-Signature` — geen Next-gen webhook |
| Applicatietoken | Optioneel `MOLLIE_WEBHOOK_TOKEN` als queryparam `token` |
| Token type | **Eigen applicatietoken** — geen Mollie signing secret |
| Vercel Preview | `x-vercel-protection-bypass` via `VERCEL_AUTOMATION_BYPASS_SECRET` |
| Returnpagina | Markeert order **niet** als betaald |
| Idempotency | `webhook_events` unique constraint |
| Onbekende payment/order | HTTP 400 |
| Dubbele delivery | HTTP 200, geen dubbele mail/orderupdate |

Code: `src/app/api/webhooks/mollie/route.ts`, `src/lib/payments/mollie.ts`, `src/lib/payments/webhook-url.ts`

---

## Environment variables

```env
MOLLIE_API_KEY=test_...
MOLLIE_WEBHOOK_TOKEN=<random-app-token>   # optioneel, timing-safe
VERCEL_AUTOMATION_BYPASS_SECRET=<secret>  # alleen Preview + Deployment Protection
```

**Niet gebruiken:** `MOLLIE_WEBHOOK_SECRET` (legacy alias — migreer naar `MOLLIE_WEBHOOK_TOKEN`).

---

## Webhook URL per omgeving

### Development

```
http://localhost:3000/api/webhooks/mollie?token=<token>
```

Mollie kan localhost niet bereiken — geen nepbetalingen of gesimuleerde webhooks.

### Vercel Preview (Deployment Protection)

```
https://<preview-host>/api/webhooks/mollie?x-vercel-protection-bypass=<secret>&token=<token>
```

Zonder `VERCEL_AUTOMATION_BYPASS_SECRET` blokkeert checkout met configuratiefout.

### Production (later)

```
https://www.vdbdigital.nl/api/webhooks/mollie?token=<token>
```

Geen Vercel-bypass in Production.

---

## Flow

1. Checkout validatie server-side (Zod, prijs herberekend)
2. Order aanmaken (status PENDING)
3. Mollie payment met `webhookUrl`, `redirectUrl`, `cancelUrl`
4. Redirect naar Mollie Hosted Checkout
5. Webhook: payment ophalen bij Mollie → order verifiëren → idempotent verwerken
6. Bevestigingsmail maximaal één keer

## WAF

`/api/webhooks/mollie` nooit in blokkerende publieke rate-limitgroep.

Zie [VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md).
