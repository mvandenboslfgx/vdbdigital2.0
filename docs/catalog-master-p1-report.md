# Catalog Master P1 — Implementation Report

Branch: `fix/catalog-master-p0`  
Date: 2026-08-20

## Summary

P1 delivers the **BUILD / AUTOMATE / GROW / SOFTWARE** product structure, software shop UI wired to the fail-closed catalog module, SSOT preparation, and quote-flow integration — without inventing open business decisions.

## What was built

### 1. Central product pillars (`src/config/catalog/`)
- Four pillars with canonical mapping to existing category slugs, commercial catalog slugs, and solution paths.
- **SOFTWARE** marked `secondary: true` with dedicated route `/shop/software`.

### 2. SSOT layer (`src/lib/commerce/catalog-ssot.ts`)
- `resolveCanonicalOfferingRef()` maps slugs → `{ kind, id, pillar }` using existing commercial/packages/bundles/care models.
- Re-exported from `@/config/commercial` for website, admin, quote, and portal consumers.
- No duplicate product table or parallel pricing model.

### 3. Shop restructuring
- **`/shop`**: PillarNav (BUILD → AUTOMATE → GROW → SOFTWARE), filters DB products via `public-shop-catalog` + pillar category map.
- **BUILD**: website packages + bundles.
- **GROW**: care packages section.
- **SOFTWARE** tab → redirects to `/shop/software`.
- **`/shop/[slug]`**: uses gated `getPublicShopProductBySlug()`.

### 4. Software shop UI (`/shop/software`, `/shop/software/[slug]`)
- Server repository: `software-public-catalog.ts` → fail-closed `queryPublicSoftwareCatalog()`.
- **0 public verified SKUs** → professional procurement panel (not empty/broken shop).
- **"Andere software nodig?"** card + CTA → `/quote?intent=software-license`.
- Only `isPublicVerifiedSoftwareItem()` / gate-passed `PUBLIC_REQUEST_ONLY` | `PUBLIC_PRICE_VERIFIED` ever render.

### 5. Homepage & navigation
- Solutions grid replaced with **4-pillar grid** (`pillarsGrid` in commercial content).
- Footer link to software licenses (secondary positioning).
- NL/EN parity for all new copy.

### 6. Quote / lead flow
- `/quote?intent=software-license&software=<slug>` prefill.
- Hidden fields: `requestIntent`, `softwareSlug`.
- Admin lead metadata includes `Intent:` and `Software SKU:`.

## Changed / added files

| Area | Files |
|------|-------|
| Pillar config | `src/config/catalog/pillars.ts`, `index.ts` |
| SSOT | `src/lib/commerce/catalog-ssot.ts`, `src/config/commercial/index.ts` |
| Software server | `src/server/repositories/software-public-catalog.ts` |
| Shop UI | `src/app/(shop)/shop/page.tsx`, `[slug]/page.tsx`, `software/page.tsx`, `software/[slug]/page.tsx` |
| Components | `pillar-nav.tsx`, `software-procurement-panel.tsx`, `software-catalog-grid.tsx` |
| Homepage | `src/components/sections/solutions-grid-section.tsx` |
| i18n | `en.ts`, `nl.ts`, `commercial.ts`, `config.ts` (paths.shopSoftware) |
| Quote | `quote-form.tsx`, `forms.ts`, `form-actions.ts` |
| Nav | `src/config/site.ts` |
| Tests | `catalog-pillars.test.ts`, `software-visibility-policy.test.ts`, `software-shop-routes.test.ts`, `software-catalog-isolation.test.ts` |
| Docs | `docs/catalog-master-p0-report.md` (P0), this file |

## Test results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** (includes `/shop/software`, `/shop/software/[slug]`) |
| `npm run test` | **PASS** — 54 files, **467 tests** |
| Catalog policy tests | **PASS** — 26 software/pillar tests |
| Secret scan test | **PASS** |

Lint: pre-existing `.cjs` script `no-require-imports` warnings only (import tooling); no new TS errors.

## Still blocked (by design)

| Item | Status |
|------|--------|
| Public software SKUs | **0** — verification gate fail-closed |
| 11 archived SKUs | Affinity, Parallels 19/20, utilities, etc. |
| 4 Windows 10 | `LEGACY_REQUEST_ONLY` — hidden from browse |
| 57 non-curated / review SKUs | `CANDIDATE_REVIEW` |
| 12 curated candidates | Awaiting supplier/region/activation proof |

## Needs business decision (unchanged — not filled)

- Essential Care included months (Website Launch System bundle)
- Business Care included months + post-bundle monthly fee
- Care inclusions: hosting, backups, SLA, cancellation (`care-inclusions.ts`)
- Per-SKU verification before any `PUBLIC_*` publication
- Parallels / RoboForm / PDF Expert / Nitro / Acronis re-listing

## Regression risks

| Risk | Mitigation |
|------|------------|
| Shop shows fewer DB products | `public-shop-catalog` gates now applied — intentional |
| Pillar filter hides products outside mapped categories | Extend `productCategorySlugs` in pillars config |
| Software detail 404 for all slugs today | Expected until verification completes |
| Partner portal UI | No partner routes exist; backend unchanged |

## Recommended next phase

1. **Business verification** of 12 curated SKU metadata (supplier, region, activation).
2. **Care bundle decisions** → set `includedCareMonths` + update bundle copy.
3. **Sync verified software** to `products` table via admin import (optional) for unified checkout later.
4. **Merge** `fix/catalog-master-p0` to app-dev branch after review — **not** SEO branch, **not** deploy until sign-off.
5. P2 polish: product images, structured data from verified fields only, partner portal pillar labels.

## Regenerate catalog after Excel changes

```bash
node scripts/import-software-catalog-xlsx.cjs
node scripts/apply-software-catalog-policies.cjs
```
