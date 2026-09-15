# VDB Digital — Cloudflare Workers migration

## Doel

Verplaats de Next.js web- en API-runtime van Vercel naar Cloudflare Workers zonder de bestaande Supabase-, Mollie- en Resend-integraties te vervangen. De productie-URL blijft `https://vdbdigital.nl`.

Cloudflare wordt eerst parallel getest. DNS/productie wordt pas omgezet nadat alle release-gates groen zijn.

## Architectuur na migratie

- Cloudflare Workers: Next.js web + route handlers/API runtime
- Cloudflare DNS/proxy: `vdbdigital.nl`
- Supabase: database, auth, storage en bestaande RLS/security
- Mollie: betalingen en webhooks
- Resend: transactionele e-mail
- Externe boekings-/rate-limitproviders: ongewijzigd waar geconfigureerd

## 1. Compatibiliteit controleren

Gebruik de actuele Cloudflare Next.js-migratietool op een schone checkout van deze branch:

```bash
npx vinext check
```

Los alle gemelde incompatibiliteiten op voordat productie wordt gewijzigd. Initialiseer Cloudflare pas daarna:

```bash
npx vinext init
```

Commit de door de actuele Cloudflare-tool gegenereerde configuratie. Genereer deze bestanden niet handmatig op basis van oude voorbeelden.

## 2. Cloudflare environment

### Production

Niet-geheime configuratie:

```text
DEPLOYMENT_ENV=production
NEXT_PUBLIC_APP_URL=https://vdbdigital.nl
NEXT_PUBLIC_SITE_NAME=VDB Digital Software
```

Neem daarnaast de bestaande publieke configuratie over die de applicatie daadwerkelijk gebruikt, waaronder Supabase publishable URL/key en eventuele Turnstile/WhatsApp-configuratie.

Zet servergeheimen uitsluitend als Cloudflare secrets/dashboard secrets, nooit als plaintext in Git:

```text
SUPABASE_SECRET_KEY
MOLLIE_API_KEY
MOLLIE_WEBHOOK_TOKEN
RESEND_API_KEY
EMAIL_FROM
EMAIL_ADMIN
TURNSTILE_SECRET_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Alleen secrets die in de huidige productieomgeving daadwerkelijk bestaan en nodig zijn, moeten worden overgenomen. Legacy aliases blijven tijdens de migratie alleen voor backwards compatibility bestaan.

### Preview

Gebruik een gescheiden preview-configuratie:

```text
DEPLOYMENT_ENV=preview
NEXT_PUBLIC_APP_URL=<cloudflare-preview-url>
```

Gebruik voor betalingen in preview uitsluitend Mollie testkeys. Gebruik nooit live productiegeheimen voor een onbetrouwbare branch/preview.

## 3. Pre-cutover gates

De Cloudflare preview mag pas naar productie wanneer minimaal dit is bewezen:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run env:scan-secrets`
6. Cloudflare/Vinext build slaagt
7. Homepage, NL-routing, shop en publieke formulieren werken
8. Customer auth/portal werkt tegen dezelfde Supabase-productionconfig
9. Admin/owner access-control en AAL2-routes gedragen zich identiek
10. Mollie TEST checkout + callback/webhook + idempotency is groen
11. Resend testmail vanaf het geverifieerde `vdbdigital.nl`-domein is groen
12. Supabase RLS/tenant-isolation tests zijn groen
13. Account-deletion endpoint en alle mobiele-app backendroutes zijn bereikbaar via de preview/runtime
14. CSRF/origin checks accepteren alleen bedoelde origins
15. Geen secret of productiecredential staat in repo, build logs of client bundle

## 4. Productie-cutover

- Koppel `vdbdigital.nl` als custom domain aan de bewezen Cloudflare Worker.
- Behoud de bestaande productie-URL; hierdoor hoeven Mollie/Resend/mobile clients alleen te veranderen als zij naar een provider-specifieke host verwijzen.
- Controleer DNS-records, mailrecords (SPF/DKIM/DMARC) en verificatierecords afzonderlijk. Verwijder geen mail-DNS tijdens de webhostingmigratie.
- Schakel DNS/proxy pas om nadat de preview en alle gates hierboven groen zijn.
- Voer direct na cutover opnieuw checkout/webhook, login, owner/admin, e-mail en account-deletion smoke tests uit.
- Houd de laatste werkende Vercel deployment tijdelijk beschikbaar als rollback totdat Cloudflare productie bewezen stabiel is.

## 5. Rollback

Bij P0/P1-regressies:

1. Stop nieuwe wijzigingen.
2. Zet het webrecord/custom-domain terug naar de laatste bewezen Vercel deployment.
3. Verander database-, Mollie- of Resend-secrets niet tijdens een hostingrollback tenzij het incident dat expliciet vereist.
4. Controleer webhook-idempotency voordat mislukte events opnieuw worden aangeboden.
5. Analyseer Cloudflare logs en herstel eerst in preview.

## 6. Wat niet wordt gemigreerd

Supabase, Mollie en Resend zijn externe kernservices en worden niet naar Cloudflare herschreven alleen om hostingkosten te besparen. Dat zou een afzonderlijke data/payment/mail-migratie zijn met andere risico's. De Cloudflare-migratie vervangt in deze fase Vercel als web/runtime-host en brengt DNS/proxy onder Cloudflare waar passend.

## Releasebesluit

`vdbdigital.nl` mag pas van Vercel af wanneer de Cloudflare deployment technisch is gegenereerd met de actuele Cloudflare tooling en de volledige pre-cutover gate aantoonbaar PASS is. Een succesvolle build alleen is geen productie-goedkeuring.
