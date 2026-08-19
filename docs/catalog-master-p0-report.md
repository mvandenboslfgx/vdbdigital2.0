# Catalog Master Fixlist — P0 Status Report

Generated as part of branch `fix/catalog-master-p0`.

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Public software SKUs | 72 (all request-only) | **0** (fail-closed until verified) |
| Curated candidates | — | **12** |
| Archived (master fixlist) | 0 | **11** |
| Legacy Windows 10 (hidden) | 4 public | **4 hidden** |
| Security variants public | 36 | **0** (6 curated candidates pending verification) |

## Removed from public catalog (archived — rows retained)

| Nr | Product | Reason |
|----|---------|--------|
| 20 | Home Upgrade Pro | Unverified manufacturer/product |
| 22–23 | IDM | Consumer utility — primary catalog |
| 24–25 | CCleaner Pro | Consumer utility — primary catalog |
| 26–27 | Parallels Desktop 19/20 | Outdated version — re-add when verifiable |
| 54 | cleanmymacx MAC | Consumer utility |
| 56 | Disk Drill Pro Lifetime | Consumer utility |
| 57 | Affinity V2 Full Set | Deprecated paid product |
| 58 | Voicemod PRO Lifetime | Consumer utility |

## Legacy (request-only, not browsable)

| Nr | Product |
|----|---------|
| 2, 5, 7, 21 | Windows 10 Pro/Home Retail/OEM |

## Candidate review (not public)

- **5** flagged for license proof: Acronis (19), Nitro Pro 14 (53), PDF Expert 3 (55), RoboForm (59), Beyond Compare (60)
- **31** non-curated security/utility variants (Avira/Trend/AVG duplicates, mac utilities, etc.)

## Curated public candidates (pending verification metadata)

Windows 11: 1, 3, 4, 6  
Security: 8, 9, 10, 12, 14, 15, 18, 52

These become `PUBLIC_REQUEST_ONLY` only when all publish-gate fields are verified (supplier, region, activation, provenance, etc.). **No prices invented.**

## Modified

- `scripts/apply-software-catalog-policies.cjs` — policy engine + naming
- `src/config/software-catalog/{policies,naming,verification,query,types}.ts`
- `src/config/commercial/bundles.ts` — `includedCareMonths: null`, `careInclusionDefined: false`
- `src/config/commercial/care-inclusions.ts` — TBD matrix (no invented terms)
- `src/i18n/content/commercial.ts` — bundle copy no longer implies care included
- `src/app/(shop)/shop/page.tsx` — careNote on bundle cards

## Retained (unchanged product rows)

- All 72 green + 396 red source rows preserved for order/history integrity
- VDB service products (websites, care, automation) untouched
- Commercial pricing remains DRAFT / `publicationReady: false`

## Needs business decision

1. **Website Launch System** — how many months Essential Care included?
2. **Business Growth System** — Business Care months + post-bundle monthly fee
3. **Care packages** — hosting, monitoring, backups, response targets, cancellation (see `care-inclusions.ts`)
4. **Software verification** — supplier, region, activation per curated SKU before any go-live
5. **Parallels** — re-list only when current version + license verifiable
6. **RoboForm / PDF Expert / Nitro / Acronis** — prove edition before public listing

## Acceptance (P0 partial — this branch)

- [x] No Affinity V2 public
- [x] No Parallels 19/20 public
- [x] No Windows 10 in default browse
- [x] No consumer utilities in curated set
- [x] Publish gate fail-closed
- [x] No Unknown/unspecified in public DTOs (0 public DTOs)
- [x] Bundle care claims clarified
- [ ] Full SSOT merge (P1)
- [ ] Software shop UI route (when catalog branch merges)
- [ ] Business verification of 12 curated SKUs

## Regenerate inventory

```bash
node scripts/apply-software-catalog-policies.cjs
```

After Excel re-import:

```bash
node scripts/import-software-catalog-xlsx.cjs
node scripts/apply-software-catalog-policies.cjs
```
