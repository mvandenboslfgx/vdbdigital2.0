# Phase 3 — Secret key migratie & live databasevalidatie

Datum: 2026-07-15

## Eindstatus

**GEREED VOOR VERCEL PREVIEW** (database + build gate OK; Resend/Upstash/tawk widget nog handmatig voor volledige productie)

---

## Eindrapport

| Stap | Status |
|------|--------|
| Secret-key migration | **PASS** |
| Environment database validation | **PASS** |
| Secret leakage scan | **PASS** |
| Supabase CLI | **PASS** (v2.109.1) |
| Project link | **BLOCKED** (interactieve `supabase login` vereist) |
| Migration push | **SKIPPED** (remote al up-to-date via MCP) |
| Migration history | **PASS** (3 migrations op remote) |
| Seed first run | **PASS** |
| Seed second run | **PASS** |
| Seed idempotency | **PASS** |
| Database verification | **PASS** |
| Live RLS tests | **PASS** |
| Owner bootstrap | **SKIPPED** (geen tijdelijke BOOTSTRAP_USER_EMAIL) |
| Lint | **PASS** |
| Typecheck | **PASS** |
| Unit tests | **PASS** (36) |
| E2E tests | **PASS** (13) |
| Build | **PASS** |

---

## Secret key migratie

- Primair: `SUPABASE_SECRET_KEY`
- Legacy fallback: `SUPABASE_SERVICE_ROLE_KEY` (deprecated, waarschuwing zonder waarde)
- Admin client: `src/lib/database/admin.ts` met `import "server-only"`
- `.env.local`: legacy key hernoemd naar `SUPABASE_SECRET_KEY`

## Environment scripts

| Script | Doel |
|--------|------|
| `npm run env:validate` | Alle groepen, informatief |
| `npm run env:validate:database` | Alleen core/database (faalt niet op tawk/Mollie) |
| `npm run env:validate:preview` | Preview + e-mail + rate limit |
| `npm run env:scan-secrets` | Leakage scan zonder waarden |

## Remote migrations (Supabase)

1. `20260714000000_initial_schema`
2. `20260714100000_phase2_rls_webhooks`
3. `20260714230000_phase3_product_rls_concept`

## Owner bootstrap

```powershell
$env:BOOTSTRAP_USER_EMAIL = "jouw-admin-emailadres"
npm run db:bootstrap-owner
Remove-Item Env:BOOTSTRAP_USER_EMAIL
```

## Nog handmatig

- `npx supabase login` + `npx supabase link --project-ref nhsrdnjfsxfikfbdmdfj` (optioneel, voor CLI workflow)
- Resend, Upstash, tawk widget ID voor volledige preview/productie
- Owner bootstrap na Auth-user aanmaken
- Producten publiceren via admin

## Resterende risico’s

- Rate limiting fail-closed zonder Upstash in productie
- E-mail en chat deels inactief zonder Resend/tawk widget
