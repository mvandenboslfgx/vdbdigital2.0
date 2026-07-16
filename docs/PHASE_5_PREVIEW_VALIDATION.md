# Phase 5 — Vercel Preview Deployment & Validatie

**Datum:** 2026-07-15  
**Vercel-plan:** Pro  
**Eindstatus:** `GEREED VOOR PREVIEW DEPLOYMENT`

---

## Uitgevoerde stappen

### 1. Owner-validatie

```powershell
npm run db:verify-owner
```

- PASS: 1 OWNER, gekoppeld aan Auth-user, profiel aanwezig
- Geen volledige e-mail/user-ID gelogd

### 2. Mollie webhookvariant

- **Klassieke Payments API-webhook** (geen Next-gen)
- Gedocumenteerd in [MOLLIE_SETUP.md](./MOLLIE_SETUP.md)

### 3. Preview environment validation

```powershell
npm run env:validate:preview
npm run env:scan-secrets
npm run db:verify
npm run db:test-rls
```

Alle PASS. Mollie testkey (`test_`). tawk.to OPTIONAL — DISABLED.

### 4. Base URL resolution

- `src/lib/url/app-url.ts` — centrale `resolveAppUrl()`
- Preview: `https://VERCEL_URL`
- Unit tests: `tests/unit/app-url.test.ts`
- `next.config.ts` injecteert preview-URL in `NEXT_PUBLIC_APP_URL` bij build

### 5. Productstatus

- 0 producten met `PUBLISHED` + `is_concept=false`
- Shop toont lege status (geen auto-publish, geen conceptprijzen publiek)
- Admin: producten zichtbaar als DRAFT/concept

### 6. Git security

- `.env.local` niet tracked
- Geen secrets in diff (repo nog zonder commits)
- `npm run env:scan-secrets` PASS

### 7. Build gate

Alle PASS (60 unit, 14 e2e, build).

### 8. Vercel authenticatie

**BLOCKED** — `npx vercel whoami` mislukt (token ongeldig).  
Actie: `npx vercel login`

### 9–10. Preview deploy

**BLOCKED** — vereist Vercel login + env vars in dashboard.

### 11. Deployment Protection & noindex

Code klaar:

- `X-Robots-Tag: noindex, nofollow` op preview (`middleware.ts`)
- `robots.txt` disallow `/` op preview

Dashboard-configuratie Deployment Protection: **handmatig na deploy**.

### 12. WAF (Pro)

6 regels handmatig (geen `tawk-hash` — tawk uit):

| Naam | Pad | Limiet | Venster | Mode |
| --- | --- | ---: | ---: | --- |
| contact-form | POST `/contact` | 5 | 10 min | Log → 429 |
| quote-form | POST `/quote` | 3 | 10 min | Log → 429 |
| support-form | POST `/support` | 10 | 10 min | Log → 429 |
| checkout-payment | POST `/checkout` | 5 | 10 min | Log → 429 |
| cart-shop | POST `/shop/*` | 30 | 10 min | Log → 429 |
| cart-basket | POST `/cart` | 20 | 10 min | Log → 429 |

Mollie `/api/webhooks/mollie`: uitgesloten van blokkerende regels.

### 13–14. Live preview acceptatie & WAF Log Mode

**SKIPPED** — geen preview-URL beschikbaar tot deploy.

---

## Volgende stappen voor Matthijs

1. `npx vercel login`
2. Preview env vars instellen (zie [VERCEL_ENV_MATRIX.md](./VERCEL_ENV_MATRIX.md))
3. `npx vercel` (nooit `--prod`)
4. Deployment Protection inschakelen
5. WAF-regels in Log Mode
6. 10 min testverkeer + observability
7. WAF naar 429
8. Mollie testbetaling + webhook

---

## Gewijzigde bestanden (Phase 5)

- `src/lib/url/app-url.ts` (nieuw)
- `scripts/verify-owner.ts` (nieuw)
- `tests/unit/app-url.test.ts` (nieuw)
- `src/lib/payments/mollie.ts`
- `src/lib/security/redirect.ts`, `origin.ts`
- `src/middleware.ts`, `src/app/robots.ts`
- `next.config.ts`
- `src/app/(shop)/shop/page.tsx`
- `docs/MOLLIE_SETUP.md`, `docs/PHASE_5_PREVIEW_VALIDATION.md`
- `package.json` (`db:verify-owner`)
