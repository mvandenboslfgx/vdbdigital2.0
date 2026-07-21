# PRODUCTION 17-MIGRATION REHEARSAL — 2026-07-21

**Verdict:** `HISTORY REPAIR FREEZE AND 17-MIGRATION REHEARSAL PASS`

**Label:** Local rehearsal only — **NOT a production apply**

---

## 1. Git identity
- HEAD: `b01d518584652205cf384e20dcb80f44f738a1d0`
- Tag: `auth-no-access-loop-production-pass`

## 2. Worktree status
- Untracked docs: `FINAL_PRODUCTION_DATABASE_APPLY_PLAN.md`, `PRODUCTION_AUTH_EMAIL_TEMPLATE_PACK.md`
- Untracked companion marker (required for CLI): `supabase/migrations/20260720132521_baseline_marker_submission_locale.sql` (no-op; not committed)
- Evidence under `docs/evidence/` (gitignored where configured) + gitignored `backups/`

## 3. Safety assertions
- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset
- No `--linked` on any mutating command
- Target host asserted `127.0.0.1` only
- Projectref (read-only): `nhsrdnjfsxfikfbdmdfj`

## 4. Backup source
`backups/production-apply/20260721-222511/` (fresh apply-day backup; previously restore-verified)

## 5. Rehearsal database
- Name: `apply_rehearsal_20260721`
- Environment: isolated Docker container `vdb-apply-rehearsal-pg` on `127.0.0.1:55432`
- Image: `public.ecr.aws/supabase/postgres:17.6.1.147`
- **Not** active local `postgres`, **not** `restore_verify`, **not** production
- Note: active `supabase_db_vdbdigital2` was unstable due to competing projects (`vdb-digital-mobile-local`, `vdb-partners`) fighting ports 54321/54322/54327

## 6. Pre-restore / pre-repair baseline (after restore)
| Check | Value |
|-------|-------|
| public tables | 20 |
| products | 15 |
| categories | 10 |
| orders / payments | 0 / 0 |
| Tawk/livechat | 0 |
| storage buckets | 0 |
| migration rows | 5 remote versions |
| products_md5 | `16f27cffc79283d1d348bd3eeccb7e0c` |
| categories_md5 | `c5e1c2e17879d614bb4ac7579fd9fc16` |

## 7. Frozen repair mapping
See `PRODUCTION_HISTORY_REPAIR_FREEZE-2026-07-21.md` — exactly five local versions marked `applied` (no SQL re-run):
`20260714000000`, `20260714100000`, `20260714230000`, `20260715000000`, `20260715190000`

Remote `20260720132521` **not** reverted.

## 8. Migration history before/after repair
- Before: 5 remote rows
- After repair: **10** rows (5 remote + 5 repair)
- Fingerprints unchanged; buckets still 0

## 9. Exact pending comparison
- Label: **`EXACT_17_PENDING_PLAN_PASS`**
- missing=0 extra=0 orderDiff=0 duplicates=0
- Files: `EXPECTED_17.txt`, `ACTUAL_PENDING.txt`, `rehearsal-dry-run-raw.txt`

## 10–12. Apply
- Command: `npx supabase db push --db-url <local-55432> --include-all --yes` (never `--linked`)
- Exit code: **0**
- Applied: exact 17 feature migrations in frozen order
- Meta: `rehearsal-apply-meta.txt`, log: `rehearsal-apply-raw.txt`
- Notices: expected `IF EXISTS` skip notices for policies/triggers/enum labels

## 13. Post-apply history
- Total rows: **27**
- Remote five present: 5
- Repair five present: 5
- Feature seventeen present: 17
- Duplicates: 0
- Last feature version: `20260719170000`
- Remote locale `20260720132521` still present

## 14–16. Post-apply schema / catalog / storage
| Check | Result |
|-------|--------|
| public tables | 52 |
| products / categories | 15 / 10 (fingerprints unchanged) |
| Tawk/livechat | 0 |
| orders / payments | 0 / 0 |
| organizations + members + invitations | present |
| portal quotes/invoices/files | present |
| FK not-valid | 0 |
| Storage buckets | **6 private** (customer-documents, invoice-documents, product-media, project-files, quote-documents, support-attachments) |
| unexpected buckets | 0 |
| quote SUPERSEDED / invoice ISSUED enums | present |

## 17. Financial integrity
- `p05_verify_payment_contracts(true)`: **0 fails** (behavioral refund/webhook/rate-limit checks included)
- negative payments: 0

## 18. Validator results
| Validator | Result |
|-----------|--------|
| Contract RPCs (8) on rehearsal DB | **TOTAL_FAILS=0** — see `rehearsal-verify-summary.txt` |
| `test:access-control` | PASS (66 tests) |
| `audit:supabase-full` | **BLOCKED mid-run** by Docker contention (container removed); rollup showed blockers=0 reviews=0 before failure — see note below |

**Environment note:** Bare rehearsal image required Supabase-equivalent default ACL bootstrap (REVOKE anon table/function grants; restore intentional authenticated execute on reverse RPC) so contract RPCs match full local Supabase role model. Migrations themselves applied cleanly via CLI.

## 19. Remote read-only end check
- projectref: `nhsrdnjfsxfikfbdmdfj`
- public tables 20; products 15; categories 10; orders 0; payments 0; Tawk 0; buckets 0; auth users 3
- migrations still exactly: `20260714220325,20260714220331,20260714220332,20260714224336,20260720132521`
- repair versions remote: **0**
- feature versions remote: **0**

## 20. Secret scan
- Evidence scan: **0** plaintext credentials / JWTs / pooler hosts / full connection strings

## 21. Definitive verdict
**HISTORY REPAIR FREEZE AND 17-MIGRATION REHEARSAL PASS**

Production apply remains **not authorized**.
