# RC2 staging grant reconciliation (incl. catalog ACL remediation)

**Date:** 2026-07-26  
**Branch:** `fix/rc2-staging-grant-reconciliation`  
**Base:** `a593e5d395fc7b90994c5cb2e8554cd241c48706`

## Purpose

Bring Git in line with staging privilege state for the RC2 grant migrations (plus an explicit catalog ACL remediation). This is **source-control reconciliation only** — not a remote apply, repair, push, or production authorization.

## Versions

| Version | Filename | SHA256 |
| --- | --- | --- |
| `20260723140000` | `20260723140000_invoice_rpc_grant_hardening.sql` | `5af3a7f42fd3d3f2603ace8c1d2a790ba8e698c79c7ce4b890d1860f871a37b5` |
| `20260723150000` | `20260723150000_invoice_rpc_grant_verify_alignment.sql` | `3bd483591ac4539353070b3527184b85c8bcfae5c576af631192b379a8c601e2` |
| `20260724103105` | `20260724103105_staging_cloud_grant_hardening.sql` | Git LF blob `87892eac…588c517` (primary Windows CRLF tree `d345803b…1a37b5`; SQL identical after CRLF→LF) |
| `20260724173000` | `20260724173000_catalog_role_acl_privileges_contract.sql` | `e38869bb1e06f86f11672d3eab115a85e1db3ed30663ac5e1dc05718538f71d8` |

Source: primary dirty worktree untracked files. Content match: **3/3** (two byte-identical; one CRLF-normalized by Git text handling, SQL unchanged).

## SQL / privilege effect (summary)

- Privilege-only (no business INSERT/UPDATE/DELETE/TRUNCATE).
- Invoice financial RPCs + contract verifiers → `service_role` EXECUTE only.
- Anon revoked on sensitive portal/org/partner tables.
- Authenticated receives RLS-usable DML on portal/org tables (RLS still enforced).
- Default privileges: stop auto-granting new public objects to anon.

## Staging / production

| Env | Status |
| --- | --- |
| Staging `qzekuvmgfekzsowdecyk` | 3 RC2 grant versions applied (read-only inventory). Catalog ACL migration version `20260724173000` is not part of staging migration history (provided there via hosted defaults / existing ACL). |
| Production `nhsrdnjfsxfikfbdmdfj` | Does **not** contain these versions |
| Local Git after reconciliation | 40 migrations; final `20260724173000` |

## Version decision

**KEEP_RC2_VERSION** — `vdb-backend-contract@0.2.0-rc.2` / `schemaVersion` `2026.07.24.mobile-compat-rc2`  
Bundle remains `unpublished: true`; no RC2 tag existed; grants are privilege-only and already intended staging RC2 state. Not an RC3 bump.

## Contract impact

- Updated `migration-manifest.json` (`grantMigrationCount: 4`, tracked migration count `40`)
- Updated release notes + manifest notes
- Recalculated checksums for edited artefacts only; `database.types.ts` hash unchanged
- Exact-17 production apply manifest **not** modified and does **not** authorize these migrations

## RC3 boundary

Four messaging migrations `2026072512*` remain **outside** RC2 (not copied, not staged).

## Catalog RLS follow-up (not part of these three files)

Resolved by adding `20260724173000_catalog_role_acl_privileges_contract.sql`:
- local `service_role` now has required catalog DML for `db:seed`
- `anon`/`authenticated` now have required catalog SELECT for `catalog db:test-rls`
- all changes are explicit SQL privileges; existing RLS policies are unchanged

## Rollback limitation

Removing these from Git after staging already applied them re-opens source-control drift. Do not blind-delete staging history. Rollback requires a separate authorized forward migration if needed.
