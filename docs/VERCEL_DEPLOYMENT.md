# Vercel Deployment — Preview (Phase 5)

**Geen Production deploy in deze fase.** Gebruik nooit `vercel --prod`.

## Troubleshooting — 404 na succesvolle build

**Symptomen:** Build slaagt (Next.js routes zichtbaar in logs), maar elke pagina geeft `NOT_FOUND`. Alleen bestanden uit `public/` (bv. `/next.svg`) werken.

**Oorzaak:** Vercel staat op Framework Preset **Other** i.p.v. **Next.js**. Vercel deployt dan alleen de `public/`-map als statische site — geen App Router routes.

**Oplossing (verplicht, eenmalig):**

1. [Vercel Dashboard → vdbdigital2-0 → Settings → Build and Deployment](https://vercel.com/matthijs-projects-301cd812/vdbdigital2-0/settings/build-and-deployment)
2. **Framework Preset** → **Next.js**
3. **Output Directory** → leeg laten (Next.js default — **niet** `public`)
4. Opslaan
5. Opnieuw deployen: `npx vercel` (geen `--prod`)

**Test daarna:** gebruik de **deployment-URL** uit de CLI output (bv. `https://vdbdigital2-0-xxxxx-matthijs-projects-301cd812.vercel.app`), niet alleen `vdbdigital2-0.vercel.app`. Log in via Vercel SSO wanneer Deployment Protection actief is.

## Troubleshooting — build geblokkeerd op Vercel

Fout:

```
Preview-build geblokkeerd — stel deze variabelen in via Vercel Dashboard …
```

**Oorzaak:** Preview environment variables ontbreken in Vercel.

**Oplossing:**

1. Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Voeg variabelen toe met scope **Preview** (niet alleen Development)
3. Zie [VERCEL_ENV_MATRIX.md](./VERCEL_ENV_MATRIX.md)
4. Opnieuw deployen: `npx vercel` (nooit `--prod`)

### `.env.local` nooit overschrijven

Bij `vercel link` of `vercel env pull`: kies **Nee** wanneer gevraagd wordt `.env.local` te overschrijven.

Gebruik desnoods:

```powershell
npx vercel env pull .env.vercel.preview --environment=preview
```

Herstel `.env.local` handmatig uit Supabase/Mollie/Resend dashboards wanneer per ongeluk overschreven.

## Volgorde (correct)

1. `npx vercel login`
2. Import/koppel GitHub-project in Vercel
3. Stel **Preview** environment variables in ([VERCEL_ENV_MATRIX.md](./VERCEL_ENV_MATRIX.md))
4. `npx vercel` — preview deploy
5. **Deployment Protection** inschakelen voor Preview
6. WAF-regels in Log Mode ([VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md))
7. Acceptatietests tegen preview-URL

## Build gate (lokaal vóór deploy)

```powershell
npm run env:validate:preview
npm run env:scan-secrets
npm run db:verify-owner
npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
npm run db:verify && npm run db:test-rls
```

## Base URL

- Server-side: `resolveAppUrl()` gebruikt `https://VERCEL_URL` op Preview
- Geen localhost in webhooks, redirects of e-mails op Preview
- `next.config.ts` zet `NEXT_PUBLIC_APP_URL` bij preview-build

## Preview noindex

- `X-Robots-Tag: noindex, nofollow` (middleware)
- `robots.txt` disallow alles op Preview

## Aandachtspunten

- Mollie: alleen `test_` keys op Preview
- tawk.to optioneel — geen WAF `tawk-hash` regel zolang uit
- Upstash niet vereist

## Status

| Fase | Status |
| --- | --- |
| Lokaal gereed | PASS |
| Vercel login + deploy | Handmatig |
| WAF actief | Handmatig na deploy |

Zie [PHASE_5_PREVIEW_VALIDATION.md](./PHASE_5_PREVIEW_VALIDATION.md).
