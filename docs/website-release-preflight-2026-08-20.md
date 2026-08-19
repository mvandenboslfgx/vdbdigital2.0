# Website Release Preflight — 2026-08-20

## Branch identity

| Field | Value |
|-------|-------|
| Release branch | `release/website-production-2026-08-20` |
| Base commit | `f3347abb27a969a926e889102b63f189726c1d7e` (`origin/main`) |
| End HEAD | `926a844` (after integration) |

## Applied commits (cherry-pick, no blind merge)

1. `2af8f91` — feat(website): catalog P0/P1 pillars, fail-closed software shop and SSOT layer (from `fix/catalog-master-p0` @ `13af51f`)
2. `cdcca02` — Add SEO infrastructure (from `seo/nl-organic-growth-clean` @ `5733de7`)
3. `1fb3a5f` — Dutch SEO landing pages (from `caca924`)
4. `926a844` — Homepage NL SEO, hreflang, sitemap (from `e8d305c`, conflict resolved)

## Conflicts resolved

- `src/i18n/config.ts`: kept `shopSoftware` + SEO landing path keys; omitted `/packages` route (shop is SSOT)

## Excluded from commit (secrets / local)

- `.local-mfa-evidence/**`
- `.local-catalog-source/**`
- `env.staging.local`

## Not integrated (intentional)

- Full `seo/nl-organic-growth` staging-recovery lineage (12 non-SEO commits)
- PHONE PHASE / Android / AAL2 device evidence branches

## Branches inspected

- `fix/catalog-master-p0` — catalog P0/P1 (integrated)
- `seo/nl-organic-growth-clean` — 3 SEO commits (integrated)
- `release/public-website-visual-recovery` — not merged (contains unrelated partner/backend deltas)
