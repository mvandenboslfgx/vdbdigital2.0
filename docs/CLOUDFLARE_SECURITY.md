# Cloudflare security & rate limiting

VDB Digital gebruikt Cloudflare als hostinglaag en een applicatie-limiter als gratis, provider-onafhankelijke basisbeveiliging.

## Gratis baseline

Voor publieke mutaties gebruikt de applicatie:

1. origin/CSRF-controle;
2. Zod-validatie en honeypots;
3. gehashte rate-limit identifiers;
4. Upstash wanneer volledig geconfigureerd;
5. anders de Supabase RPC `check_rate_limit` als duurzame fallback.

Checkout en payment-buckets zijn **fail-closed**: als geen duurzame limiter beschikbaar is, wordt de mutatie geweigerd in plaats van onbeveiligd door te gaan.

## Limieten per minuut

De limieten staan in `src/lib/security/rate-limit.ts`, waaronder:

- contact: 5
- offerte: 3
- support: 10
- account-verwijdering: 3
- checkout/payment: 5
- adres autocomplete: 60
- adres details: 20
- document uploads/downloads: aparte portal-limieten

## Mollie webhook

`/api/webhooks/mollie` is server-to-server verkeer en wordt niet behandeld als een publieke formulierbucket. De route:

- gebruikt optioneel `MOLLIE_WEBHOOK_TOKEN`;
- haalt de echte paymentstatus opnieuw bij Mollie op;
- controleert bedrag en valuta;
- verwerkt webhookevents idempotent;
- activeert recurring subscriptions pas na een betaalde eerste betaling.

Blokkeer de Mollie-webhook niet met een algemene Cloudflare rate-limitregel.

## Cloudflare WAF

Betaalde of aanvullende Cloudflare WAF-regels zijn optioneel. De applicatiebeveiliging hierboven is de functionele baseline zodat de site niet afhankelijk is van betaalde WAF-features.
