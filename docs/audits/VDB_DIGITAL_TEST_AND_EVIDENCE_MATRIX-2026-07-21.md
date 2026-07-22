# VDB Digital — Test and Evidence Matrix (2026-07-21)

**HEAD:** `1544d445d1d05c700b59360bdd4015afb0727bb8`  
**Evidence dir:** `docs/evidence/forensic-audit-2026-07-21/` (gitignored)

## Tooling snapshot

| Item | Value | Level |
|------|-------|-------|
| OS | Windows NT 10.0.19045 | PROVEN |
| Node | v24.15.0 | PROVEN |
| npm | 11.12.1 | PROVEN |
| Supabase CLI | 2.109.1 | PROVEN |
| Docker | 29.6.1 | PROVEN |
| Git | 2.54.0.windows.1 | PROVEN |
| Tag on HEAD | `production-database-apply-ready` | PROVEN |
| Pre-freeze claim HEAD | `b01d518…` | CONTRADICTED vs current |
| Manifest SHA256 | `948073dd9b0ea86bd7729a259cb169fb112974cd72da33d884f105799b16e4bf` | PROVEN |
| Old claimed hash | `c4cc9d92150e46bd4507008c9bce4913296c4f6c040744a4262cccc7d8b474c2` | CONTRADICTED (stale) |
| Marker SHA256 | `9e56d53c62b6d0fb63237d0002814a46220a6636545c1dc913caee65a593dd5f` | PROVEN |

## Install / static / build

| Gate | Command | Result | Evidence |
|------|---------|--------|----------|
| npm ci | `npm ci` | PASS exit 0 | `01-npm-ci.txt` |
| Lockfile dirty? | `git status` after ci | CLEAN (no lock change) | snapshot |
| typecheck | `npm run typecheck` | PASS exit 0 | `04-typecheck.txt` |
| lint | `npm run lint` | PASS exit 0 | `05-lint.txt` |
| secret-scan | `npm run env:scan-secrets` | PASS clean | `06-secret-scan.txt` |
| npm audit | `npm audit` / `--omit=dev` | 2 moderate (postcss/next) | `07-npm-audit*.txt` |
| build | `npm run build` (CHECKOUT off) | PASS exit 0 | `09-build.txt` |

## Automated tests

| Suite | Command | Tests | Result | Level |
|-------|---------|------:|--------|-------|
| Vitest all | `npm test` | 433 pass / 1 fail (timeout) | FAILED | FAILED |
| Access-control | `npm run test:access-control` | 66/66 | PASS | PROVEN |
| Security pack | `npm run test:security` | 75/75 | PASS | PROVEN |
| No-Tawk | `npm run catalog:verify-no-tawk` | — | PASS | PROVEN |
| Checkout gate | `npm run checkout:release-gate` | — | NOT READY (expected) exit 2 | PROVEN fail-closed |
| Playwright e2e | `npx playwright test tests/e2e/site.spec.ts` | — | FAILED (port 3000 busy) | FAILED |

## Supabase / migrations

| Gate | Result | Evidence |
|------|--------|----------|
| `supabase db reset` (local `supabase_db_vdbdigital2:54322`) | PASS exit 0; 27 history rows | `12-db-reset.txt`, `12-migration-*.txt` |
| Companion marker no-op | PASS SELECT-only | marker file + hash |
| 5 repairs + 17 features + 5 markers | PASS exact | migration inventory |
| 6 private buckets | PASS `public=false` | `12-buckets.txt` |
| `npm run audit:supabase-full` | PASS blockers=0 reviews=0 | `14-supabase-full.txt` |
| Remote migration list `--linked` | 5 remote versions only (pre-apply) | `16-remote-migration-list.txt` |
| `db:verify-auth-portal` etc (docker) | PASS | `15-*.txt` |
| `db:verify-p0-payments` / catalog via `.env` | FAIL RPC missing on **remote** target | expected pre-apply; tooling P2-006 |
| `db:verify-customer-portal` | REFUSE non-local host | safety PROVEN |

## Live site (GET/HEAD only)

| URL | Result |
|-----|--------|
| `https://vdbdigital.nl/` | 200 + HSTS/CSP/XFO |
| `www` → apex | 308 |
| `/nl`, `/shop`, `/inloggen`, `/privacy` | 200 |
| `/admin`, `/portal` (anon) | 307 → `/inloggen` |
| `/geen-toegang` (anon) | 307 → `/inloggen` (page requires session — by design) |
| unknown path | 404 |
| Tawk in homepage HTML | absent |
| Deployment == freeze HEAD | UNPROVEN (`origin/main` still `b01d518`) |

## Backup / restore

| Check | Result |
|-------|--------|
| Path `backups/production-apply/20260721-222511/` | present, 13 files |
| CHECKSUMS.sha256 | 11 OK / 0 BAD / 0 MISSING |
| gitignored | YES (`/backups/`) |
| Inventory remote buckets=0, products=15, migrations=5 | matches pre-apply claim |
| Restore previously verified | SUPPORTED (`restore_verified=true` in INVENTORY) — not re-run this audit |

## Coverage notes (critical flows)

| Flow | Unit/security | Local DB contract | E2E | Live |
|------|---------------|-------------------|-----|------|
| Auth no-access loop | PROVEN | — | UNPROVEN | SUPPORTED redirects |
| Checkout fail-closed | PROVEN | — | UNPROVEN | — |
| Portal org isolation | SUPPORTED | PASS contracts | UNPROVEN | — |
| Staff RBAC fine-grained | PARTIAL — P1 gaps | — | — | — |
| Payments live | N/A blocked | RPC local exists | — | — |
| Catalog Tawk removal | PROVEN | migration applied local | — | PROVEN HTML |
| a11y / perf / mobile | UNPROVEN | — | — | headers only |
