# VDB Digital Software

Premium digital platform for **VDB Digital Software** — custom websites, webshops, AI automation, and ongoing support.

**Tagline:** Software built around your business. / Software gebouwd rond jouw bedrijf.

**Languages:** English at `/` (default) · Dutch at `/nl`. See [Internationalisation](#internationalisation).

**Commercial:** [`docs/COMMERCIAL_MASTER_COMPLETION.md`](docs/COMMERCIAL_MASTER_COMPLETION.md) · pricing matrix · legal checklist.

**Beoordeling (alles-in-één):** [`docs/BEOORDELINGSDOSSIER.md`](docs/BEOORDELINGSDOSSIER.md) — bedoeld om te laten reviewen.

**Languages:** English at `/` (default) · Dutch at `/nl` (same English pathnames, Dutch UI). See [Internationalisation](#internationalisation).

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (English) or [http://localhost:3000/nl](http://localhost:3000/nl) (Dutch).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run env:validate` | Validate env keys (no values logged) |
| `npm run env:validate:database` | Supabase core keys only |
| `npm run env:validate:preview` | Preview profile (no Upstash/tawk widget required) |
| `npm run env:scan-secrets` | Secret leakage scan |
| `npm run db:seed` | Database seed |
| `npm run db:verify` | Database verification |
| `npm run db:verify-owner` | OWNER validation (no full email logged) |
| `npm run db:test-rls` | Live RLS tests |

## Structure

- `src/app/` — Next.js App Router routes
- `src/components/` — UI, layout, sections, forms
- `src/config/` — Site config & product seed data
- `src/features/` — Cart, checkout, orders
- `src/i18n/` — Locales, dictionaries, content maps, SEO helpers
- `src/lib/` — Auth, database, email, payments, security
- `src/server/` — Server actions, repositories, services
- `supabase/migrations/` — Database schema

## Internationalisation

- **English-first:** root URLs (`/solutions`, `/contact`, …) with no `/en` prefix.
- **Dutch:** `/nl` prefix (`/nl/solutions`, `/nl/contact`, …); middleware rewrites internally.
- **Admin:** English-only at `/admin/*`; `/nl/admin` redirects to `/admin`.
- **Docs:** [`docs/I18N.md`](docs/I18N.md) (quick reference) · [`docs/I18N_ARCHITECTURE.md`](docs/I18N_ARCHITECTURE.md) (middleware, dictionaries, forms, email, SEO)

QA checklists: [`docs/TRANSLATION_QA.md`](docs/TRANSLATION_QA.md), [`docs/I18N_ROUTE_MATRIX.md`](docs/I18N_ROUTE_MATRIX.md), [`docs/PUBLIC_ROUTE_QA.md`](docs/PUBLIC_ROUTE_QA.md).

## Database scripts

```powershell
npm run env:validate         # Env keys (no values logged)
npm run db:seed              # Idempotent product seed (DRAFT + is_concept)
npm run db:verify            # Validates tables, categories, products, RLS
npm run db:test-rls          # Live RLS tests against Supabase
npm run db:bootstrap-owner   # One-time OWNER bootstrap (see docs/ADMIN_BOOTSTRAP.md)
```

See `docs/PHASE_5_PREVIEW_VALIDATION.md` for the latest preview validation run.

## Concept prices

Product prices in `src/config/products.seed.ts` are **concept prices** — review and confirm final rates before launch.
