# Cloudflare deployment policy

VDB Digital deployt uitsluitend via Cloudflare Workers/OpenNext.

## Harde regels

- Geen Vercel deployment.
- Geen automatische Cloudflare builds op Git pushes.
- Bouwen en reviewen gebeurt eerst in een aparte Git-branch.
- Een productie-deploy gebeurt alleen na een expliciete operatorbeslissing.
- De production origin is exact `https://vdbdigital.nl`.
- `VDB_DEPLOYMENT_ENV=production` is verplicht voor productie.
- Preview/test gebruikt `VDB_DEPLOYMENT_ENV=preview` en nooit een live Mollie-key.

## Kostenbeleid

De Git-trigger voor Cloudflare Builds hoort uit te staan. Daardoor veroorzaakt een commit geen Cloudflare build of deploy. De release wordt handmatig gestart nadat lint, typecheck, tests, databasechecks en de release gate groen zijn.

## Releasecheck vóór productie

```bash
npm run lint
npm run typecheck
npm run test
npm run env:scan-secrets
npm run db:verify
npm run db:test-rls
npm run checkout:release-gate
npm run build
```

De lokale `npm run build` valideert de applicatie zonder Cloudflare deployment-credits te gebruiken.

## Runtime

- Next.js + OpenNext for Cloudflare
- Worker-configuratie: `wrangler.jsonc`
- OpenNext-configuratie: `open-next.config.ts`
- Productiedomein: `vdbdigital.nl`
- Database/auth: Supabase
- Betalingen: Mollie
- E-mail/marketing: Resend
- Adreszoeker: Google Places API (New)

## Legacy Vercel blokkade

`vercel.json` bestaat uitsluitend als failsafe zolang een oud Vercel-project mogelijk nog aan GitHub gekoppeld is. `ignoreCommand: "exit 0"` zorgt ervoor dat een eventuele Vercel Git-build wordt overgeslagen. Het bestand is geen deploymentconfiguratie voor VDB Digital.
