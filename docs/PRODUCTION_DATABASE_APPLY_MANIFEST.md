# PRODUCTION DATABASE APPLY MANIFEST

**Status:** FREEZE AND AUDIT PASS — production apply still NOT AUTHORIZED  
**Verdict meaning:** This document is **not** production-apply authorization.  
**Project:** vdb nieuw · `nhsrdnjfsxfikfbdmdfj` · eu-west-1  
**CLI (verified):** Supabase `2.109.1`  
**Current HEAD (pre-freeze):** `b01d518584652205cf384e20dcb80f44f738a1d0`  
**Current tag:** `auth-no-access-loop-production-pass`  
**Proven backup:** `backups/production-apply/20260721-222511/`  
**Date:** 2026-07-21

---

## 0. Authorization lock

Production apply may start **only** after a new user message with **exactly** this structure:

```text
AUTHORIZE PRODUCTION DATABASE APPLY
PROJECTREF: nhsrdnjfsxfikfbdmdfj
GIT HEAD: <definitieve-freeze-commit>
MANIFEST SHA256: <sha256>
BACKUP: <actuele-gevalideerde-backup>
APPLY THE FIVE HISTORY REPAIRS AND EXACT 17 FEATURE MIGRATIONS
```

These are **not** authorization: “akkoord”, “ga verder”, “doe maar”, “ziet er goed uit”.

After GO/NO-GO 1 (history repair), a **second** explicit human confirmation is required before `db push`.

### Labels used below

- `NOT EXECUTED`
- `REQUIRES EXPLICIT PRODUCTION APPLY AUTHORIZATION`

---

## 1. Proven status (read-only inventory)

| Gate | Status |
|------|--------|
| DATABASE CREDENTIAL ROTATION | VERIFIED |
| CLI remote connection | PASS |
| Local clean start / db reset | PASS |
| Stable `audit:supabase-full` end-gate | PASS (2026-07-21; blockers=0; reviews=0) |
| Fresh apply-day backup + restore | PASS (`20260721-222511`) |
| History repair freeze + 17-migration rehearsal | PASS |
| Contract RPCs on rehearsal | TOTAL_FAILS=0 |
| Remote unchanged after rehearsal | PASS |
| Secret-scan | 0 |
| `CHECKOUT_ENABLED` | false |
| `P05_MIGRATION_APPLIED` | unset |

### Still open before apply

1. Explicit production-apply authorization (exact message form in §0)  
2. GO/NO-GO 1 + GO/NO-GO 2 human confirmations during apply  
3. Production apply is **not** authorized  

### Closed by freeze/audit gate (this pass)

1. Companion-marker validated + included in freeze commit  
2. Stable `audit:supabase-full` PASS (0 blockers / 0 reviews)  
3. Evidence promoted to tracked `docs/`  
4. Freeze commit + local tag `production-database-apply-ready`  

---

## 2. Companion-marker (CLI prerequisite — not a repair)

**Validation:** `LOCALE COMPANION MARKER VALIDATION PASS`

| Field | Value |
|-------|--------|
| File | `supabase/migrations/20260720132521_baseline_marker_submission_locale.sql` |
| Version | `20260720132521` (exactly one local file) |
| Pattern | Same as existing baseline markers: comments + single `SELECT` of text literals |
| SHA256 | `9e56d53c62b6d0fb63237d0002814a46220a6636545c1dc913caee65a593dd5f` |
| Forbidden DDL/DML | none (no CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/TRUNCATE/GRANT/REVOKE) |
| Role | Local history alignment with **already-applied** remote row |
| Repair set | **Not** one of the five repairs |
| Feature set | **Not** one of the 17 features |

Functional locale DDL already exists remotely under `20260720132521` ≡ local content `20260715190000`.  
**Never** `migration repair --status reverted 20260720132521`.

Without this file, CLI fails (`remote migration versions not found`) and may incorrectly suggest reverting the locale version.

---

## 3. Frozen five history repairs (metadata only)

| # | Local version (register `applied`) | Local content file | Existing remote marker |
|---|------------------------------------|--------------------|------------------------|
| 1 | `20260714000000` | `20260714000000_initial_schema.sql` | `20260714220325` |
| 2 | `20260714100000` | `20260714100000_phase2_rls_webhooks.sql` | `20260714220331` |
| 3 | `20260714230000` | `20260714230000_phase3_product_rls_concept.sql` | `20260714220332` |
| 4 | `20260715000000` | `20260715000000_phase6_access_control.sql` | `20260714224336` |
| 5 | `20260715190000` | `20260715190000_submission_locale.sql` | `20260720132521` |

Hard rules:

- Exactly five repairs; companion-marker is **not** a sixth repair  
- Remote `20260720132521` stays **applied**  
- No existing remote row deleted, renamed, or reverted in the happy path  
- Repair changes **migration history only** — baseline SQL is **not** re-executed  

Expected history after repairs, before feature apply: **10** rows (5 remote + 5 repair).

---

## 4. Frozen 17 feature migrations

| # | Version | File | Purpose | Key objects | Risks | TX expectation | Post-check | Failure boundary |
|---|---------|------|---------|-------------|-------|----------------|------------|------------------|
| 1 | `20260716000000` | `p0_payment_integrity.sql` | Payment/order integrity | orders/payments RPCs, indexes | Medium — payment paths | Single migration TX | `p05`/`orders` columns | B2 if fail mid-apply |
| 2 | `20260716010000` | `p05_rate_limit_hardening.sql` | Rate-limit hardening | `rate_limit_buckets` policies | Low | Single TX | deny anon/auth policies | B2 |
| 3 | `20260716020000` | `p05_verify_payment_contracts.sql` | Payment verify RPC | `p05_verify_payment_contracts` | Low | Single TX | RPC exists; contracts ok | B2 |
| 4 | `20260716200000` | `catalog_admin.sql` | Catalog admin schema | translations/media/addons | Medium — catalog shape | Single TX | catalog tables present | B2 |
| 5 | `20260716210000` | `catalog_admin_hardening.sql` | Catalog hardening | constraints/policies | Low | Single TX | hardening checks | B2 |
| 6 | `20260716220000` | `catalog_verify_admin_contracts.sql` | Catalog verify RPC | `catalog_verify_admin_contracts` | Low | Single TX | RPC TOTAL_FAILS=0 | B2 |
| 7 | `20260716230000` | `catalog_admin_storage.sql` | Product media storage | `product-media` bucket + deny policies | Medium — Storage | Single TX | private bucket | B2 |
| 8 | `20260717000000` | `customer_portal.sql` | Portal foundation | orgs/members/invites/portal_* | **High** | Single TX | org tables + RLS | B2 |
| 9 | `20260718000000` | `remove_tawk_catalog.sql` | Remove Tawk catalog residue | catalog rows/slugs | Low | Single TX | Tawk/livechat=0 | B2 |
| 10 | `20260718120000` | `auth_portal_foundation_verify.sql` | Auth/portal verify | verify RPCs | Low | Single TX | foundation contracts | B2 |
| 11 | `20260718200000` | `project_management.sql` | Projects | portal project tables | High | Single TX | project tables/RLS | B2 |
| 12 | `20260719120000` | `documents_storage.sql` | Document buckets | 5 private doc buckets | Medium — Storage | Single TX | 6 private buckets total | B2 |
| 13 | `20260719135000` | `quote_status_enum_bridge.sql` | Quote enum bridge | `portal_quote_status` labels | **Enum** — hard to reverse | Single TX | SUPERSEDED etc. | B2 |
| 14 | `20260719140000` | `quotes_acceptance.sql` | Quotes acceptance | quote items/versions/acceptances | High | Single TX | quote contracts | B2 |
| 15 | `20260719155000` | `invoice_status_enum_bridge.sql` | Invoice enum bridge | `portal_invoice_status` | **Enum** | Single TX | ISSUED etc. | B2 |
| 16 | `20260719160000` | `invoices_financial_documents.sql` | Invoices | invoice items/versions/payments | High | Single TX | invoice contracts | B2 |
| 17 | `20260719170000` | `invoice_payment_reversal_integrity.sql` | Reversal integrity | reverse RPCs/triggers | Medium | Single TX | last version exact | B2/B3 |

No other pending migration allowed. Companion + baseline markers must **not** be pending (already in remote history).

---

## 5. Planned freeze-commit (NOT EXECUTED)

### Proposed message

```text
chore: freeze production database apply baseline
```

### Proposed tracked file list (exact)

| Path | Why |
|------|-----|
| `supabase/migrations/20260720132521_baseline_marker_submission_locale.sql` | Validated no-op companion |
| `docs/FINAL_PRODUCTION_DATABASE_APPLY_PLAN.md` | Prior plan context |
| `docs/PRODUCTION_DATABASE_APPLY_MANIFEST.md` | This manifest |

### Evidence promotion (required before freeze-commit)

`docs/evidence/` is **gitignored**. Before freeze-commit, copy these into tracked paths (do not invent secrets):

| Source (gitignored) | Proposed tracked copy |
|---------------------|------------------------|
| `docs/evidence/PRODUCTION_HISTORY_REPAIR_FREEZE-2026-07-21.md` | `docs/PRODUCTION_HISTORY_REPAIR_FREEZE.md` |
| `docs/evidence/PRODUCTION_17_MIGRATION_REHEARSAL-2026-07-21.md` | `docs/PRODUCTION_17_MIGRATION_REHEARSAL.md` |
| `docs/evidence/PRODUCTION_DATABASE_APPLY_MANIFEST_READINESS-2026-07-21.md` | `docs/PRODUCTION_DATABASE_APPLY_MANIFEST_READINESS.md` |

Then include those three tracked copies in the same freeze-commit.

### Separate docs commit (recommended)

`docs/PRODUCTION_AUTH_EMAIL_TEMPLATE_PACK.md` — Auth email branding pack; **not** required for database apply. Prefer a separate documentation commit so the freeze-commit stays apply-scoped.

### Do **not** include

- `app/`, `src/`, `scripts/`, `package.json`, lockfiles  
- Existing migration content files (unchanged)  
- `supabase/config.toml` / deployment configs  
- Backups, `.env`, credentials  

### Tests before freeze-commit

- Companion-marker re-validation (no-op keywords + SHA256)  
- `git status` shows only intended files  
- `npm run test:access-control`  
- Confirm no unexpected migration diffs  

### Tests after freeze-commit

- `git rev-parse HEAD` → record as **definitive freeze HEAD**  
- Worktree clean  
- Optional tag later (do not create now): `production-database-apply-ready`  

### Freeze artefacts (filled after freeze commit in readiness + end report)

| Item | Value |
|------|--------|
| Freeze HEAD | Recorded after commit (`git rev-parse HEAD`) |
| Freeze tag | `production-database-apply-ready` (local) |
| Marker SHA256 | `9e56d53c62b6d0fb63237d0002814a46220a6636545c1dc913caee65a593dd5f` |

**Hard rule:** No production apply from dirty worktree. No production apply without explicit authorization message.

---

## 6. Stable full-audit end-gate (CLOSED — PASS)

`npm run audit:supabase-full` orchestrates isolation/schema/auth/storage/foreign-data.  
Local DB access expects Docker container name **`supabase_db_vdbdigital2`** on ports **54321/54322** (pinned in `supabase/config.toml`).  

**Port freeze (2026-07-22):** Mobile = `54521/54522`, Partner = `54421/54422`. Do **not** stop sibling stacks from this repo. See `docs/local-infrastructure-isolation.md`.

### Required procedure

```text
EXECUTED — PASS (2026-07-21)
Evidence: docs/evidence/STABLE_FULL_AUDIT-2026-07-21.txt
Tracked note: docs/PRODUCTION_DATABASE_APPLY_MANIFEST_READINESS.md
Label: SUPABASE ISOLATION AUDIT PASS
blockers=0 reviews=0 exit=0
Historical note: that run used a DB-only container / temporary sibling stops under port contention.
SUPERSEDED POLICY (2026-07-22): never stop vdb-digital-mobile-local or vdb-partners from this repo.
Going forward:

1. Read-only: docker ps — confirm only vdbdigital2 owns 54321/54322
2. If a sibling still binds 543xx defaults → isolation FAIL on that sibling (fix to 544xx/545xx); do not kill it here
3. Own stack only: npx supabase stop --project-id vdbdigital2   # if restart needed
4. npx supabase start   # or -x analytics if 54327 contested within THIS band
5. Confirm: docker ps | findstr supabase_db_vdbdigital2
6. CHECKOUT_ENABLED=false ; P05_MIGRATION_APPLIED unset
7. npm run audit:supabase-full
```

### Pass criteria

- Exit code **0**  
- blockers=**0**  
- reviews=**0**  
- End label: **`SUPABASE ISOLATION AUDIT PASS`**  

Do **not** modify audit scripts to force PASS.  
If audit cannot finish stably: **`PRODUCTION APPLY READINESS BLOCKED`**.

Isolated rehearsal DB on :55432 is **not** a substitute for this audit without code changes (not allowed).

---

## 7. Backup gate

| Item | Value |
|------|--------|
| Last proven backup | `backups/production-apply/20260721-222511/` |
| Status | FRESH APPLY-DAY BACKUP AND RESTORE PASS |
| Required artifacts | schema/data public + migrations + storage (+ stubs), INVENTORY, CHECKSUMS.sha256, RESTORE.md |
| Secret-scan | 0 plaintext credentials |

### Hard rules

- Max backup age at apply: **same calendar apply-day**, or re-backup if any of the following changed since backup:  
  products/categories/orders/payments, Auth user count, migration history, Storage inventory, Git HEAD, projectref  
- Always verify checksums + non-empty files + gitignore of `/backups/`  
- Restore-verify to isolated local DB (not production, not active app `postgres`) before mutative phases  
- No apply with mismatched baseline fingerprints  

---

## 8. Fresh pre-apply remote baseline (read-only, every apply session)

| Check | Required |
|-------|----------|
| projectref | `nhsrdnjfsxfikfbdmdfj` |
| public tables | 20 |
| products | 15 |
| categories | 10 |
| orders / payments | 0 / 0 |
| Tawk/livechat | 0 |
| Storage buckets | 0 |
| Auth users (masked) | 3 |
| CHECKOUT_ENABLED | false |
| P05_MIGRATION_APPLIED | unset |

Remote history **exactly**:

```text
20260714220325
20260714220331
20260714220332
20260714224336
20260720132521
```

Before apply: **zero** repair versions remote; **zero** feature versions (`20260716…`–`20260719…`) remote.  
Any deviation → **STOP**.

---

## 9. Future CLI sequence (NOT EXECUTED)

### FASE A — Identity & baseline (read-only)

```text
NOT EXECUTED — REQUIRES EXPLICIT PRODUCTION APPLY AUTHORIZATION

git rev-parse HEAD
git status --short
git describe --tags --exact-match HEAD

# Must equal freeze HEAD + clean worktree + freeze tag

type supabase\.temp\project-ref
# Must print: nhsrdnjfsxfikfbdmdfj

npx supabase migration list --linked
# Remote column must show exactly the five versions above
```

### FASE B — Five metadata repairs

```text
NOT EXECUTED — REQUIRES EXPLICIT PRODUCTION APPLY AUTHORIZATION
# GO/NO-GO 1 must be APPROVED first
# Confirm projectref = nhsrdnjfsxfikfbdmdfj immediately before each command

npx supabase migration repair --linked --status applied 20260714000000 --yes
npx supabase migration repair --linked --status applied 20260714100000 --yes
npx supabase migration repair --linked --status applied 20260714230000 --yes
npx supabase migration repair --linked --status applied 20260715000000 --yes
npx supabase migration repair --linked --status applied 20260715190000 --yes
```

**Forbidden:** `--status reverted` · repairing `20260720132521` · `--db-url` with secrets in logs/docs.

### FASE C — History check after repair

```text
NOT EXECUTED

npx supabase migration list --linked
# Expect: original 5 remote + 5 repair = 10 applied history rows
# Remote locale 20260720132521 still present / applied
```

### FASE D — Dry-run (exact 17)

```text
NOT EXECUTED — REQUIRES EXPLICIT PRODUCTION APPLY AUTHORIZATION
# GO/NO-GO 2 must be APPROVED before real push

npx supabase db push --linked --include-all --dry-run --yes
```

Dry-run must list **exactly** the 17 files in §4 order.  
Must **not** list companion-marker, baseline-markers, or repair content versions as pending.

### FASE E — Second human approval

Explicit confirmation after dry-run PASS (separate from GO/NO-GO 1).

### FASE F — Remote apply

```text
NOT EXECUTED — REQUIRES EXPLICIT PRODUCTION APPLY AUTHORIZATION

npx supabase db push --linked --include-all --yes
```

`--include-all` is required by CLI `2.109.1` when remote history contains versions reconciled via markers/repairs (proven in rehearsal).  
Do **not** document production `--db-url` strings (credential risk). Prefer `--linked` after projectref verification.

### FASE G — Post-apply validation

See §12.

### FASE H — Evidence & close

Write apply-day evidence (gitignored ok): timestamps, migration list, counts, validator exits, secret-scan=0. No secrets.

---

## 10. GO/NO-GO moments

### GO/NO-GO 1 — before any history repair

Required:

- projectref `nhsrdnjfsxfikfbdmdfj`  
- freeze-commit HEAD + tag `production-database-apply-ready`  
- clean worktree  
- companion-marker PASS  
- `audit:supabase-full` PASS (0/0)  
- backup gate PASS (current)  
- remote baseline exact  
- checkout false / P05 unset  
- no open incidents  
- authorization message (§0)  

### GO/NO-GO 2 — after repairs, before `db push`

Required:

- original 5 remote rows intact  
- 5 repair rows present; total **10**  
- locale `20260720132521` not reverted  
- schema/data counts unchanged (15/10/0/0, fingerprints)  
- dry-run exact 17; no extras/missing/wrong order  
- no credential leak in output  
- **second** explicit human approval  

Without both approvals: **no apply**.

---

## 11. Stop criteria (hard)

Wrong projectref · unclear target · dirty worktree · wrong HEAD · missing freeze tag · companion not pure no-op · duplicate version · full audit not complete PASS · backup stale/mismatch · restore not PASS · remote baseline drift · products≠15 · categories≠10 · unexpected orders/payments · Tawk>0 · Storage buckets≠0 before apply · Auth count drift · remote history drift · unexpected pre-existing repair row · locale missing/reverted · repair command fail · ≠5 repairs · ≠17 pending · wrong order · companion/baseline pending · SQL error · timeout · network drop · unexpected lock · long TX · secret in output · CHECKOUT true · P05 set · Mollie live · missing human approval.

On any stop: **no auto-retry**, **no auto-reverted**, **no next phase**, capture evidence, report incident.

---

## 12. Rollback / incident boundaries

| Boundary | State | Action |
|----------|-------|--------|
| **B0** | Before any remote mutation | Abort; re-run all gates |
| **B1** | ≥1 repair done, no feature migration | Stop; snapshot history; compare fingerprints; **no** automatic `--status reverted`; no row delete without separate incident approval; may resume later if inventory exact |
| **B2** | Partial feature apply | Stop; record last applied version; no force next migration; no blanket reverted; no manual drops; checkout stays off; choose forward-fix **or** restore from verified backup **or** isolated rebuild — rehearse first; need incident approval |
| **B3** | All migrations applied, post-check fails | Keep checkout off / P05 unset; block feature activation; isolate cause; object/data diff; separate fix/restore approval |

**Hard rule:** `migration repair --status reverted` is **not** schema/data rollback.

---

## 13. Expected post-apply history

- 5 original remote rows  
- 5 repair rows  
- 17 feature rows  
- **Total 27** unique versions; no duplicates; no reverted  
- Last feature: `20260719170000`  
- `20260720132521` remains present/applied  
- Companion file does **not** add an extra history row (version already remote)  

---

## 14. Post-apply validation (minimum)

**History:** 27 versions; no unexpected/duplicate/reverted  

**Schema:** expected tables/functions/triggers; FK not-valid=0; RLS/policies/grants; no orphans  

**Catalog:** products=15; categories=10; fingerprints unchanged; Tawk/livechat=0  

**Transactions:** orders=0; payments=0; `p05_verify_payment_contracts(true)` PASS; no negative/duplicate finance rows  

**Storage:** exactly six private buckets  

```text
customer-documents
invoice-documents
product-media
project-files
quote-documents
support-attachments
```

all `public=false`  

**Auth:** users still 3 unless proven legitimate change between baseline and apply; no password/MFA/OWNER mutation  

**Portal / quotes / invoices:** org tables present; enum bridges; acceptance + reversal integrity; no orphan items  

**Validators:**

- `npm run audit:supabase-full` → PASS, blockers=0, reviews=0  
- Eight contract RPCs → TOTAL_FAILS=0  
- `npm run db:verify-p0-payments`, `db:verify-catalog-admin`, portal/project/documents/quotes/invoices verifiers as applicable  
- `catalog:verify-no-tawk`  
- Relevant unit tests  
- secret-scan=0  

---

## 15. POST-DATABASE-APPLY ACTIVATION — NOT AUTHORIZED

Even after a successful database apply:

- `CHECKOUT_ENABLED` remains **false**  
- `P05_MIGRATION_APPLIED` remains **unset**  
- Mollie live remains **off**  
- No automatic OWNER reset / MFA / portal “production-ready” claim  
- No deployment  
- No customer communication  
- No live-money payment tests  

Database apply and feature activation are **separate** changes requiring separate authorization.

---

## 16. Worktree snapshot at manifest authoring (2026-07-21)

| Class | Paths |
|-------|--------|
| Untracked (expected) | `docs/FINAL_PRODUCTION_DATABASE_APPLY_PLAN.md`, `docs/PRODUCTION_AUTH_EMAIL_TEMPLATE_PACK.md`, `supabase/migrations/20260720132521_baseline_marker_submission_locale.sql`, this manifest |
| Gitignored evidence | `docs/evidence/*` (freeze, rehearsal, readiness) |
| Gitignored backups | `backups/production-apply/20260721-222511/` |
| Tracked modified code/migrations/config | **none** observed |

HEAD: `b01d518584652205cf384e20dcb80f44f738a1d0` · tag: `auth-no-access-loop-production-pass`

---

## 17. Document control

| Field | Value |
|-------|--------|
| Manifest path | `docs/PRODUCTION_DATABASE_APPLY_MANIFEST.md` |
| Readiness evidence | `docs/evidence/PRODUCTION_DATABASE_APPLY_MANIFEST_READINESS-2026-07-21.md` |
| Manifest SHA256 | *filled in readiness evidence after write* |

**PRODUCTION DATABASE FREEZE AND AUDIT PASS** does **not** mean production apply is authorized. Feature activation remains locked (§15).
