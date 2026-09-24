# Mollie Setup

## Webhookvariant

VDB Digital gebruikt de klassieke Mollie Payments API-webhook. De webhook ontvangt een payment-ID; de applicatie haalt daarna de payment opnieuw op via de Mollie API en vertrouwt niet op clientstatus.

| Aspect | Implementatie |
| --- | --- |
| Webhook URL | Per payment/subscription via `webhookUrl` |
| Payload | `application/x-www-form-urlencoded` met payment-ID |
| Status | Opnieuw ophalen via `mollie.payments.get(paymentId)` |
| Applicatietoken | Optioneel `MOLLIE_WEBHOOK_TOKEN` |
| Returnpagina | Markeert een order nooit zelfstandig als betaald |
| Idempotency | `webhook_events` + payment status transitions |
| Recurring | Eerste payment met `sequenceType=first`, daarna Mollie subscription |
| Hosting | Cloudflare Workers/OpenNext |

## Environment

```env
VDB_DEPLOYMENT_ENV=preview
NEXT_PUBLIC_APP_URL=https://<preview>.workers.dev
MOLLIE_API_KEY=test_...
MOLLIE_WEBHOOK_TOKEN=<random-app-token>
```

Een `live_` Mollie-key wordt buiten `VDB_DEPLOYMENT_ENV=production` fail-closed geweigerd.

## URLs

### Development

```
http://localhost:3000/api/webhooks/mollie?token=<token>
```

Mollie kan localhost niet rechtstreeks bereiken.

### Cloudflare preview

```
https://<preview>.workers.dev/api/webhooks/mollie?token=<token>
```

Gebruik alleen testmode op preview.

### Production

```
https://vdbdigital.nl/api/webhooks/mollie?token=<token>
```

## Eenmalige betaling

1. server-side checkoutvalidatie;
2. order + orderregels opslaan;
3. Mollie Hosted Checkout payment maken;
4. gebruiker met HTTP redirect naar Mollie;
5. Mollie webhook haalt payment opnieuw op;
6. bedrag, currency, order en transition worden gecontroleerd;
7. betaalde order wordt vrijgegeven en bevestiging maximaal één keer verzonden.

## Abonnement

1. recurring SKU in checkout;
2. Mollie customer aanmaken/hergebruiken;
3. eerste payment met `sequenceType=first`;
4. na `paid` wordt een Mollie subscription aangemaakt;
5. subscription metadata bevat de lokale order- en productreferentie;
6. Mollie zet subscription metadata door naar de automatisch gegenereerde recurring payments;
7. recurring webhooks werken de lokale subscription/paymentstatus bij.

Zie ook `docs/CLOUDFLARE_SECURITY.md`.
