# VDB Digital — Production Readiness Scorecard (2026-07-21)

**Overall forensic verdict:** `VDB DIGITAL FORENSIC AUDIT FAIL`  
**Production GO/NO-GO:** **NO-GO**  
**Production DB apply authorization:** **NOT AUTHORIZED** (process lock intact)

Scoring uses: PASS | PASS WITH FINDINGS | FAIL | BLOCKED | UNPROVEN

| Domain | Score | Notes |
|--------|-------|-------|
| Git/repository integrity | PASS WITH FINDINGS | Clean at audit start; ahead of origin by 2; audit docs untracked after write |
| Reproducible install | PASS | `npm ci` exit 0 |
| Build | PASS | `next build` exit 0; middleware deprecation warning |
| Static quality | PASS | typecheck+lint 0; low ignore counts |
| Tests | FAIL | Full vitest 1 timeout fail; e2e port fail; security suites PASS |
| Architecture | PASS WITH FINDINGS | Solid App Router; missing error/loading; layout-only auth |
| Application security | FAIL | P1 staff scope + webhook token; otherwise strong fail-closed checkout |
| Authentication | PASS WITH FINDINGS | Magic link/callback/geen-toegang design PROVEN in code; e2e UNPROVEN |
| Authorization | FAIL | P1-001..003 |
| Supabase isolation | PASS | Full audit PASS 0/0 |
| Migrations | PASS | Local reset 27 rows; set exact; companion no-op |
| Database integrity | PASS WITH FINDINGS | Local contracts mostly PASS; remote pre-apply incomplete by design |
| Storage | PASS | 6 private buckets local; remote baseline 0 buckets |
| Catalog | PASS | No-Tawk PASS; remote products=15 baseline documented |
| Payments | PASS WITH FINDINGS | Fail-closed PROVEN; webhook token P1; checkout gate NOT READY |
| Portal | PASS WITH FINDINGS | Contracts PASS; IDOR staff-side is admin P1 |
| Quotes/invoices | FAIL | App filters incomplete + DEFINER grants P1 |
| E-mail | UNPROVEN | Templates documented; Dashboard paste pack; no live send this audit |
| Environment | PASS WITH FINDINGS | CHECKOUT absent/false; P05 unset; secrets present locally, not printed |
| Deployment provenance | UNPROVEN / FAIL for freeze match | Live site up; SHA vs `1544d44` not proven; origin at `b01d518` |
| Live-site behavior | PASS WITH FINDINGS | Public GET/HEAD OK; headers strong |
| SEO/content | PASS WITH FINDINGS | robots/sitemap live; sitemap gaps P2 |
| Accessibility | UNPROVEN | Not systematically measured |
| Performance | UNPROVEN | No Lighthouse/CWV capture |
| Mobile | UNPROVEN | No viewport matrix this run |
| Privacy | PASS WITH FINDINGS | Legal pages exist; juridical correctness not certified |
| Backup/restore | PASS | 222511 checksums OK; prior restore flag; not re-restored |
| Documentation | FAIL | HEAD/hash/backup contradictions vs freeze |
| Production database apply-readiness | PASS WITH FINDINGS | Freeze+audit gate done; apply still unauthorized; P1s block enablement trust |

## GO criteria checklist (from audit brief §38)

| Criterion | Met? |
|-----------|------|
| No P0 | YES |
| No P1 | **NO** |
| Reproducible install PASS | YES |
| Production build PASS | YES |
| Required tests PASS | **NO** (full vitest fail; e2e fail) |
| Stable full Supabase audit PASS | YES |
| blockers=0 reviews=0 | YES |
| Migration set exact | YES (local) |
| Companion marker PASS | YES |
| Remote baseline exact | YES (5 versions + locale) |
| Backup gate PASS | YES |
| Secret-scan clean | YES |
| Worktree explained | YES |
| Docs consistent | **NO** |
| Checkout false / P05 unset / Mollie live off | YES |
| No unexplained deployment diff | **NO** |
| Explicit apply auth still separate | YES (not granted) |

**Conclusion:** Production enablement and DB apply remain **NO-GO**.
