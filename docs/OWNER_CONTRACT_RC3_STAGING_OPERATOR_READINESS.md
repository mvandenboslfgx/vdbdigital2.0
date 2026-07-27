# OWNER CONTRACT RC.3 — Staging operator readiness

**Milestone:** `OWNER CONTRACT RC.3 — STAGING OPERATOR READINESS`  
**Prior locked status:** `OWNER CONTRACT RC.3 LOCAL PASS — STAGING NOT APPLIED`  
**Date:** 2026-07-25  
**HEAD:** `a593e5d395fc7b90994c5cb2e8554cd241c48706` (no commit required for this doc gate)  
**Apply:** **NOT EXECUTED**

## Verdict (this gate)

```text
OWNER CONTRACT RC.3 — STAGING PREFLIGHT PASS — APPLY NOT AUTHORIZED
```

**Prior readiness limitation cleared for preflight:** linked CLI to `qzekuvmgfekzsowdecyk` successfully ran read-only `supabase db query --linked` (MCP still cannot access staging). Evidence: [`docs/artifacts/rc3-staging-preflight-evidence.md`](artifacts/rc3-staging-preflight-evidence.md).

**Apply remains closed** until a separate explicit owner authorization.

## Locked local DoD (accepted)

| Item | Status |
| --- | --- |
| Contract | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion | `2026.07.25.messaging-support-appointments-rc3` |
| Local migrations applied | `20260725120000`…`20300` on `supabase_db_vdbdigital2` |
| Contract verify | PASS |
| RLS/RPC suite | 32/32 PASS |
| typecheck / lint / unit | PASS |
| portal / partner / invoices verify | PASS |
| checkout release gate | exit **2** (fail-closed, expected) |
| Staging / production apply | **not done** |
| Mobile / Partner pin | **not done** |

Exact apply files + hashes: [`docs/artifacts/rc3-apply-manifest.md`](../artifacts/rc3-apply-manifest.md).

## Target identity matrix

| Env | Ref | Allowed in this milestone |
| --- | --- | --- |
| Staging | `qzekuvmgfekzsowdecyk` | read-only preflight **yes**; apply **only after** green preflight + explicit owner auth |
| Production | `nhsrdnjfsxfikfbdmdfj` | **deny** — identity confirmed ACTIVE_HEALTHY via MCP; never write |

Local CLI `supabase/.temp/project-ref` currently reads `qzekuvmgfekzsowdecyk` (staging-linked). Treat any `db push` as **forbidden** until this readiness checklist is green and owner authorizes.

## Operator preflight checklist (read-only)

Run against staging only. Stop on any FAIL.

1. **Identity**
   - [ ] `STAGING_SUPABASE_PROJECT_REF=qzekuvmgfekzsowdecyk`
   - [ ] `STAGING_SUPABASE_URL=https://qzekuvmgfekzsowdecyk.supabase.co`
   - [ ] `APP_ENV=staging`
   - [ ] `npm run staging:assert-target` → exit **0**
   - [ ] Linked CLI ref ≠ `nhsrdnjfsxfikfbdmdfj`

2. **Migration history drift**
   - [ ] List remote `supabase_migrations.schema_migrations` (or Dashboard migration history)
   - [ ] Highest version ≥ `20260724160000` (rc.2 present)
   - [ ] None of `20260725120000`…`20300` already partially applied
   - [ ] No unknown forks / renamed versions conflicting with repo filenames

3. **Baseline object presence (SELECT-only)**
   - [ ] `portal_conversations`, `portal_messages`, `portal_support_tickets`, `portal_support_replies`
   - [ ] `portal_projects`, `portal_quotes`, `portal_invoices`, `portal_files`, `partner_commissions`
   - [ ] `feature_flags` + `feature_flag_enabled(text[])`
   - [ ] Confirm **absent** before apply: `portal_message_attachments`, `portal_appointments`, `verify_messaging_support_appointments_contracts()`

4. **Rollback / blast-radius**
   - [ ] Snapshot/backup plan recorded
   - [ ] Operator accepts: enum `NEW` is non-removable; rollback = revoke RPCs + flags off
   - [ ] No `db reset` on staging

5. **Checkout / money**
   - [ ] `CHECKOUT_ENABLED` remains off
   - [ ] `npm run checkout:release-gate` still exit **2** (website)
   - [ ] No Mollie live keys; staging Mollie stays test-only if present

## Apply authorization gate (not opened)

Do **not** apply until all of the following are true:

1. Preflight checklist above all checked.
2. Explicit owner message authorizing staging apply of RC.3 to `qzekuvmgfekzsowdecyk`.
3. Apply uses exact files/hashes in `docs/artifacts/rc3-apply-manifest.md` in order.
4. Immediate post-verify: `verify_messaging_support_appointments_contracts()` returns zero failures.
5. Feature flags remain `false` unless separately authorized.

## After green staging verify (later milestones — not now)

```text
Pin Mobile/Partner:
  VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
  VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
  Map: support_messages → portal_support_replies
```

Then: authenticated staging flows per role → only then Mobile preview rebuild.

## Still forbidden

- Mobile / Partner repo edits
- New Mobile preview/device validation for this pin
- Any write to `nhsrdnjfsxfikfbdmdfj`
- Checkout activation
- Agent apply via MCP (staging permission absent; production must never be used as substitute)

## Agent / CLI preflight evidence (2026-07-25)

| Check | Result |
| --- | --- |
| MCP `list_projects` | only `nhsrdnjfsxfikfbdmdfj` visible (unchanged limitation) |
| Linked CLI ref | `qzekuvmgfekzsowdecyk` |
| `migration list --linked` | remote tip `20260724160000`; RC.3 local-only |
| `db query --linked` preflight | **ALL PASS** — see `docs/artifacts/rc3-staging-preflight-evidence.md` |
| Checkout gate | exit **2** |

**Status after preflight:** `OWNER CONTRACT RC.3 — STAGING PREFLIGHT PASS — APPLY NOT AUTHORIZED`
