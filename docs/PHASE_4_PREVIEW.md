# Phase 4 — Preview environment

## Status applicatie

Build gate slaagt. Environment geconfigureerd (geen Upstash).

**Eindstatus:** `GEREED VOOR VERCEL PREVIEWCONFIGURATIE`

Openbare preview pas na:

1. Deployment Protection op preview
2. WAF-regels ingesteld (Log Mode → 429)
3. Handmatige validatie (zie uitrolvolgorde)

## WAF

- Werkelijke routes: [HTTP_MUTATION_ROUTES.md](./HTTP_MUTATION_ROUTES.md)
- Plan-specifieke regels: [VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md)
- **Hobby:** 1 gecombineerde regel (`public-mutations-combined`)
- **Pro:** aparte regels per formulier/checkout
- **Mollie webhook:** uitgesloten van blokkerende publieke regel

## Uitrolvolgorde

1. Preview deploy + Deployment Protection
2. WAF Log Mode
3. 10 min testverkeer
4. Observability check
5. Schakel over naar 429
6. Formulieren + checkout retest
7. Mollie webhook apart testen

## Na WAF-validatie

Status wordt: `GEREED VOOR VERCEL PREVIEW`
