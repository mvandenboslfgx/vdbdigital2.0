# PRODUCTION HISTORY REPAIR FREEZE — 2026-07-21

**Label:** `NOT EXECUTED — PRODUCTION APPLY REQUIRES SEPARATE EXPLICIT APPROVAL`

**Evidence class:** History-repair freeze (planning + local rehearsal only)  
**Project:** vdb nieuw (`nhsrdnjfsxfikfbdmdfj`)  
**Git HEAD:** `b01d518584652205cf384e20dcb80f44f738a1d0`  
**Git tag:** `auth-no-access-loop-production-pass`  
**Backup source:** `backups/production-apply/20260721-222511/`

---

## Frozen mapping (exactly five)

| # | Local version (register as applied) | Local migration file | Existing remote marker (leave applied) |
|---|-------------------------------------|----------------------|----------------------------------------|
| 1 | `20260714000000` | `20260714000000_initial_schema.sql` | `20260714220325` |
| 2 | `20260714100000` | `20260714100000_phase2_rls_webhooks.sql` | `20260714220331` |
| 3 | `20260714230000` | `20260714230000_phase3_product_rls_concept.sql` | `20260714220332` |
| 4 | `20260715000000` | `20260715000000_phase6_access_control.sql` | `20260714224336` |
| 5 | `20260715190000` | `20260715190000_submission_locale.sql` | `20260720132521` |

## Functional equivalence

The five remote markers already encode the schema effects of the five local baseline migrations.
Repair only inserts companion history rows so the CLI treats those local versions as already applied.
**No baseline SQL is re-executed.**

## Why SQL is not re-run

Re-applying baseline DDL against a live production catalog would risk conflicts, data loss, and divergent objects.
History repair is bookkeeping only: mark local version IDs as `applied` without executing their SQL.

## Expected history BEFORE repair (remote / restored baseline)

```
20260714220325
20260714220331
20260714220332
20260714224336
20260720132521
```

Total: **5** rows.

## Expected history AFTER repair (before feature apply)

Original five remote rows **unchanged**, plus:

```
20260714000000
20260714100000
20260714230000
20260715000000
20260715190000
```

Total: **10** rows.

## Explicit warning — remote locale version

- Remote `20260720132521` **remains applied**.
- Remote `20260720132521` must **never** be marked `reverted`.
- Do **not** delete, rename, or rewrite any of the five existing remote migration rows.
- Do **not** add a sixth repair version or treat baseline-marker files as repair versions.

## Exact future production commands (TEXT ONLY — NOT EXECUTED)

```text
# Target MUST be production only after separate explicit approval.
# NEVER run these during rehearsal.

npx supabase migration repair --status applied --linked 20260714000000
npx supabase migration repair --status applied --linked 20260714100000
npx supabase migration repair --status applied --linked 20260714230000
npx supabase migration repair --status applied --linked 20260715000000
npx supabase migration repair --status applied --linked 20260715190000

# Then (separate approval):
npx supabase db push --linked --include-all
```

**WARNING:** The CLI may suggest `repair --status reverted 20260720132521`. That advice is **WRONG** for this project. Ignore it.

## Safety gates (unchanged)

- `CHECKOUT_ENABLED=false`
- `P05_MIGRATION_APPLIED` unset
- No OWNER reset / MFA / Storage / Auth mutations in this freeze document

## Status

`NOT EXECUTED — PRODUCTION APPLY REQUIRES SEPARATE EXPLICIT APPROVAL`

---

## CLI prerequisite discovered during rehearsal (not a sixth repair)

Local file required so db push can reconcile remote-only history row 20260720132521:

- supabase/migrations/20260720132521_baseline_marker_submission_locale.sql (no-op SELECT marker)
- Same pattern as existing 20260714220325…20260714224336 baseline markers
- **Not** a repair version; remote row stays applied; never everted
- Created during this rehearsal worktree; **not committed** in this gate

Without this file, CLI errors with: remote migration versions not found locally, and incorrectly suggests reverting 20260720132521.
