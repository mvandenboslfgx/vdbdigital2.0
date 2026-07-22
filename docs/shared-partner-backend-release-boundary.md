# Shared Partner Backend — Release Boundary

**Branch:** `phase/shared-partner-backend`  
**Base:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`  
**Date:** 2026-07-22

## Existing production apply baseline (unchanged)

Ends at feature migration:

```text
20260719170000_invoice_payment_reversal_integrity.sql
```

Plus the five history-repair mappings and companion marker documented in the existing apply manifest.

**Exact-17 rehearsal evidence remains historically valid for that phase only.**

## New partner migrations (this branch)

- Are **local / branch-only** until staging PASS + new production rehearsal + new/supplemental apply manifest + explicit authorization.
- Must **not** be silently appended to the old production apply manifest.
- Old manifest SHA256 values **do not** authorize partner migrations.
- Staging (when created) may apply the **full** chain including partner migrations from a release candidate of this branch.
- Production requires a **new** rehearsal and apply plan covering partner versions.

## Staging later

- Staging may apply the **full** migration chain including partner versions from an RC of this branch.
- Production requires a **new** rehearsal and a **new or supplemental** apply manifest.
- Old manifest SHA256 values **do not** authorize partner migrations.
- No remote apply before a full shared staging PASS.

## Non-authorization

- Production apply of partner migrations: **NOT AUTHORIZED**
- Staging project: **NOT CREATED** by this workstream until `CANONICAL PARTNER BACKEND LOCAL PASS`
- Existing exact-17 production apply: **NOT EXECUTED** and **does not** cover partner domain
- Current production project (`nhsrdnjfsxfikfbdmdfj`): **read-only / unchanged**
