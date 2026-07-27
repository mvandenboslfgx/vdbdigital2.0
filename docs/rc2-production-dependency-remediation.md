# RC2 production dependency remediation

**Date:** 2026-07-27  
**Branch:** `fix/rc2-production-dependency-remediation`  
**Base:** `3364af5633fc8aac5fc45d8baf9601df264a74b4`  
**Contract:** `vdb-backend-contract@0.2.0-rc.2` / `2026.07.24.mobile-compat-rc2` (unchanged)

## Goal

Targeted remediation of the three **production** npm audit highs without `npm audit fix`, without major upgrades, and without changing migrations or backend contracts.

## Baseline (before)

| Package | Version(s) | Path |
| --- | --- | --- |
| `next` | 16.2.10 | direct |
| `postcss` | 8.4.31 (nested under `next`), 8.5.19 (dev via Tailwind/Vite) | transitive |
| `sharp` | 0.34.5 | optional via `next` |

**npm audit --omit=dev:** critical=0, high=**3**, moderate=0, low=0  
**npm audit (all):** critical=0, high=12, moderate=0, low=0

## Remediation applied

1. **Direct patch:** `next` 16.2.10 → **16.2.12** (`npm install --save-exact next@16.2.12`)
   - Addresses Next.js advisories patched in ≥16.2.11 (middleware/proxy bypass, Server Actions DoS/SSRF, cache confusion, image optimizer DoS, etc.).

2. **Scoped overrides** (transitive resolution where Next still pins vulnerable nested deps):
   ```json
   "overrides": {
     "next": {
       "postcss": "8.5.23",
       "sharp": "0.35.3"
     }
   }
   ```
   - `postcss`: nested 8.4.31 → **8.5.23** (≥8.5.12 advisory fix floor)
   - `sharp`: 0.34.5 → **0.35.3** (≥0.35.0 libvips advisory fix floor)

No new direct dependencies. No `npm audit fix`. No RC3 messaging. No migration/contract edits.

## After

| Package | Version(s) |
| --- | --- |
| `next` | 16.2.12 |
| `postcss` (production path) | 8.5.23 (overridden under `next`) |
| `sharp` (production path) | 0.35.3 (overridden under `next`) |
| `postcss` (dev path) | 8.5.19 via `@tailwindcss/postcss` / Vite (dev-only) |

**npm audit --omit=dev:** critical=0, high=**0**, moderate=0, low=0  
**npm audit (all):** critical=0, high=**9** (eslint/minimatch/brace-expansion dev toolchain only)

## Lockfile impact

- **Changed:** 36 packages (Next SWC binaries, nested postcss/sharp, `@img/sharp-*` platform packages)
- **Added:** 2 optional platform packages (`@img/sharp-freebsd-wasm32`, `@img/sharp-webcontainers-wasm32`)
- **Removed:** 0
- **Registry origin:** `https://registry.npmjs.org` only

## Reachability summary

| Advisory area | Classification | Notes |
| --- | --- | --- |
| Next.js Server Actions / middleware | PRODUCTION_REACHABLE | App uses `"use server"` actions and `src/middleware.ts` locale rewrite |
| Next.js custom-server SSRF | NOT_REACHABLE | Vercel/standard Next hosting, no custom server |
| PostCSS source-map / stringify | BUILD_TIME_ONLY | Tailwind/Next CSS pipeline; no user-controlled CSS input |
| sharp / libvips | PRODUCTION_REACHABLE (image optimizer) | Next Image optimization path; no direct user GIF/TIFF upload processing |

**PRODUCTION_EXPLOITABLE:** 0 (before and after contextual review)

## RC2 regression evidence

- `npm ci` PASS (clean reinstall, lockfile unchanged after commit)
- `npm run build` PASS
- Next start smoke: `/` 200, `/nl` 200, `/portal` 307, `/admin` 307 (auth redirects expected)
- 40-migration `supabase db reset` PASS; final `20260724173000`
- `db:seed` PASS; `db:test-rls` **13/13 PASS, 0 skipped**
- Partner/financial/portal/invoice/quote/catalog contract verifiers PASS (local `partner_payouts` flag temporarily enabled for scenario 9, restored to fail-closed)
- Storage: **6 private / 0 public** buckets
- Secret scan: REAL_SECRET_MATCHES=0

## Full Supabase isolation audit

`audit:supabase-full` remains **BLOCKED** in this clean-room worktree (no `.env.local` with approved production project URL). This is expected and unchanged from prior RC2 audits. Local Docker DB proofs above remain the runtime gate.

## Residual dev findings

9 high findings in eslint/minimatch/brace-expansion chain — dev-only, no production runtime exposure. Not remediated in this pass (would require eslint major bump).

## Remote actions

None. No push, tag, staging, or production mutation.
