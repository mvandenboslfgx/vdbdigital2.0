# Final Production Database Apply Plan

**Status:** PLAN ONLY — no remote mutations executed  
**Apply-day preflight:** **BLOCKED** — `DATABASE CREDENTIAL ROTATION REQUIRED` (2026-07-21)  
**Git HEAD:** `b01d518` (`auth-no-access-loop-production-pass`)  
**Project:** `vdb nieuw` / `nhsrdnjfsxfikfbdmdfj`  
**Backup:** `backups/production-apply/20260721-210514/` (gitignored)  
**Date:** 2026-07-21

Do **not** run repair / `db push` / Storage create until a separate explicit apply order.

### Apply-day blocker (secret hygiene)

A prior `db dump --dry-run` retained a pooler login in a Cursor agent-tools log. That log file was scrubbed/deleted locally; **operator must still rotate the production database password**, update only local/Vercel secrets (never Git/docs/chat), then confirm CLI reconnect. Until then: **STOP — no further apply-day remote preflight.**

---

## 1. Preflight (verified)

| Check | Result |
|-------|--------|
| Branch | `main` |
| HEAD | `b01d518` |
| Worktree | only untracked `docs/PRODUCTION_AUTH_EMAIL_TEMPLATE_PACK.md` (out of scope) |
| Linked project | `nhsrdnjfsxfikfbdmdfj` / **vdb nieuw** / `ACTIVE_HEALTHY` |
| CLI | Supabase `2.109.1` |

## 2. Local Docker

- `supabase stop` / `start` / `db reset`: all local migrations applied in file order (incl. both enum bridges).
- Competing project on `54322`: after port freeze, Mobile must use `54522` and Partner `54422`. **Do not** stop sibling stacks from this repo; treat wrong ports as isolation FAIL.

## 3. Isolation audit

Earlier stable run: **SUPABASE FULL ISOLATION AUDIT PASS** (repo + remote linked to approved project).  
Re-run on apply day after stopping competing Docker stacks.

## 4–5. Backup + restore

| Artifact | Notes |
|----------|--------|
| Path | `backups/production-apply/20260721-210514/` |
| Dumps | public schema+data, migrations schema+data, storage schema+data, auth metadata |
| Inventory | 20 public tables, 15 products, 10 categories, 0 orders/payments, 0 Tawk, 0 buckets, 5 remote migration versions |
| Restore | Isolated DB `restore_verify` + auth stubs → **SCHEMA_OK**, 35 policies, counts match |
| Result | **FRESH PRODUCTION BACKUP CREATED** · **FRESH PRODUCTION BACKUP VERIFIED** · **RESTORE PROCEDURE VERIFIED** |

## 6. Remote history (current)

| Version | Name | Role |
|---------|------|------|
| `20260714220325` | `20260714000000_initial_schema` | baseline content (remote timestamp) |
| `20260714220331` | `20260714100000_phase2_rls_webhooks` | baseline content |
| `20260714220332` | `20260714230000_phase3_product_rls_concept` | baseline content |
| `20260714224336` | `phase6_access_control` | baseline content |
| `20260720132521` | `submission_locale_columns` | **remote-only**; ≡ local `20260715190000` |

Local no-op markers `20260714220325`…`20260714224336` remain intact.

### Equivalence (re-confirmed)

| Remote | Local content | Class |
|--------|---------------|-------|
| `20260714220325` | `20260714000000` | **FUNCTIONALLY_EQUIVALENT** |
| `20260714220331` | `20260714100000` | **FUNCTIONALLY_EQUIVALENT** |
| `20260714220332` | `20260714230000` | **FUNCTIONALLY_EQUIVALENT** |
| `20260714224336` | `20260715000000` | **FUNCTIONALLY_EQUIVALENT** |
| `20260720132521` | `20260715190000` | **FUNCTIONALLY_EQUIVALENT** (extra mapping) |

## 7. History repair plan (NOT executed)

CLI (`migration repair --help`):  
`supabase migration repair [flags] <version...>` with `--status applied|reverted` and `--linked`.

```bash
npx supabase migration repair --linked --status applied 20260714000000
npx supabase migration repair --linked --status applied 20260714100000
npx supabase migration repair --linked --status applied 20260714230000
npx supabase migration repair --linked --status applied 20260715000000
# Required fifth (locale already on remote under different version):
npx supabase migration repair --linked --status applied 20260715190000
```

**Why:** remote schema already has equivalent DDL under other version IDs; re-running local content migrations would be wrong; future feature migrations must apply normally.

**Do not** mark any version `reverted` in the happy path.  
**Do not** remove remote `20260720132521`.

### Expected history after repair

Remote shows as applied: four baseline markers **and** local content timestamps above **and** `20260720132521`.  
Pending local-only starts at `20260716000000`.

Verify: `npx supabase migration list --linked`

Rollback of wrong repair: `npx supabase migration repair --linked --status reverted <version>` then re-assess (never blind).

## 8. Migrations to apply after repair (exact order)

| Version | File | Purpose | Lock/tx risk | Rollback |
|---------|------|---------|--------------|----------|
| `20260716000000` | `p0_payment_integrity` | payment/order integrity RPCs | medium | forward-fix / restore |
| `20260716010000` | `p05_rate_limit_hardening` | rate_limit_buckets | low | forward-fix |
| `20260716020000` | `p05_verify_payment_contracts` | verifier RPC | low | forward-fix |
| `20260716200000` | `catalog_admin` | catalog admin objects | medium | restore if catalog damaged |
| `20260716210000` | `catalog_admin_hardening` | hardening | low | forward-fix |
| `20260716220000` | `catalog_verify_admin_contracts` | verifier | low | forward-fix |
| `20260716230000` | `catalog_admin_storage` | `product-media` bucket + deny policies | medium | Storage rollback §10 |
| `20260717000000` | `customer_portal` | orgs/members/invites/portal_* | **high** | restore |
| `20260718000000` | `remove_tawk_catalog` | catalog hygiene | low | forward-fix |
| `20260718120000` | `auth_portal_foundation_verify` | verifier | low | forward-fix |
| `20260718200000` | `project_management` | portal projects | high | restore |
| `20260719120000` | `documents_storage` | doc buckets/policies | medium | Storage rollback |
| `20260719135000` | `quote_status_enum_bridge` | enum bridge | **enum** | no simple reverse |
| `20260719140000` | `quotes_acceptance` | portal quotes | high | restore |
| `20260719155000` | `invoice_status_enum_bridge` | enum bridge | **enum** | no simple reverse |
| `20260719160000` | `invoices_financial_documents` | portal invoices | high | restore |
| `20260719170000` | `invoice_payment_reversal_integrity` | reversal integrity | medium | forward-fix |

**Not in apply list:** the four equivalent content migrations + `20260715190000` (repaired).

Post-apply verifiers: `db:verify-p0-payments`, `db:verify-auth-portal`, `db:verify-project-management`, `db:verify-documents-storage`, `db:verify-quotes-acceptance`, `db:verify-invoices-financial`, `catalog:verify-no-tawk`.

## 9. Official upgrade rehearsal

On restored production baseline + simulated repair + sequential apply of §8:

- All 17 feature migrations **PASS**
- Products **15**, categories **10**, orders/payments **0**, Tawk **0**
- `organizations` / `organization_members` / `organization_invitations` **present**
- Portal projects/quotes/invoices objects present (`portal_*`)
- **6** private buckets created in rehearsal
- **OFFICIAL CLI PRODUCTION UPGRADE REHEARSAL PASS** (psql apply of official migration files; no skipped migrations; no autocommit workaround)

## 10. Storage plan (finalize)

See also `docs/PRODUCTION_STORAGE_APPLY_PLAN.md`.

| Bucket | Public | Size | Required by code |
|--------|--------|------|------------------|
| `customer-documents` | private | 25 MiB | yes |
| `project-files` | private | 50 MiB | yes |
| `quote-documents` | private | 25 MiB | yes |
| `invoice-documents` | private | 25 MiB | yes |
| `support-attachments` | private | 25 MiB | yes |
| `product-media` | private | 5 MiB | yes (catalog admin contract) |

All deny direct anon/authenticated Storage access; app uses service-role + signed URLs.  
Apply after DB migrations; verify `public=false`; never leave a bucket public.

## 11. Apply order (execution day)

1. Confirm maintenance window  
2. Confirm project ref `nhsrdnjfsxfikfbdmdfj`  
3. Confirm `CHECKOUT_ENABLED=false`, `P05_MIGRATION_APPLIED` unset  
4. Confirm backup checksums  
5. Export `migration list --linked`  
6. Run §7 repairs only  
7. Re-list migrations — pending must start at `20260716000000`  
8. `npx supabase db push --linked` (or approved equivalent) — stop if extra/unexpected versions  
9. Remote schema/object checks  
10. Remote DB verifiers  
11–13. Storage buckets + RLS + Storage verifiers  
14. Public smoke  
15–18. OWNER password reset → login → TOTP → AAL2  
19. Admin smoke  
20–21. Customer invite/membership later → portal smoke with test org  
22. Checkout remains off  

## 12. Hard stops

Wrong projectref · backup/restore not verified · history changed since inventory · equivalence lost · repair wrong counts · `db push` wants unexpected migrations · migration error · lock/timeout · data loss · product/category drift · Tawk return · financial verifier fail · isolation fail · Storage too open · checkout/P05 not fail-closed · competing local Docker on 54322.

## 13. Rollback

| Phase | Action |
|-------|--------|
| A Before push | `migration repair --status reverted` for mistaken applied marks |
| B During push | Stop; record last applied version; no further migrations |
| C Partial schema | Prefer forward-fix; else full restore from §4 backup |
| D Data integrity | Keep portal closed; restore |
| E Storage | Force private; pull policies; no uploads until verified |

Most migrations are **not** safely reverse-SQL’d (esp. enums).

## 14. Gates (this planning run)

| Gate | Result |
|------|--------|
| lint / typecheck | PASS |
| npm test / test:access-control | PASS (retry after flaky timeouts) |
| build | PASS |
| catalog:verify-no-tawk | PASS |
| audit:supabase-full | PASS when Docker stable; intermittent BLOCKED if mobile-local takes port |
| db verifiers (local Docker) | PASS when container up (auth/project/docs/quotes/invoices) |
| db:verify-p0-payments vs **remote** | FAIL expected (RPC not remote yet) |

## 15. Verdict

**PRODUCTION DATABASE APPLY PLAN CONDITIONAL PASS**

Conditions before execution order:

1. Confirm local port matrix (`docs/local-infrastructure-isolation.md`): only `vdbdigital2` on `54321/54322`. If a sibling still binds those ports, fix the sibling — do **not** stop it from this repo.  
2. Include **`20260715190000`** history repair (locale).  
3. Re-run full local audit + Docker verifiers on apply day with stable stack.  
4. Separate explicit production apply command required — **do not** treat this plan as authorization to mutate.

## Confirmations

- No remote migration repair  
- No remote migrations applied  
- No Storage/Auth mutations  
- No OWNER password reset / MFA  
- No deployment  
- No Git commit/tag/push  
- `CHECKOUT_ENABLED=false`  
- `P05_MIGRATION_APPLIED` unset  
- No Mollie live payment  
