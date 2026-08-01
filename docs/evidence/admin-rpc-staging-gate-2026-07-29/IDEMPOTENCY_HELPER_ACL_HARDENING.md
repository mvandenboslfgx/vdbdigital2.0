# Idempotency Helper ACL Hardening

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Date (UTC):** 2026-07-29
**Scope:** local + staging only — production forbidden

## Problem

Staging ACL after RC4 apply:

```text
admin_idempotency_get  {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
admin_idempotency_put  {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

Local after reset: `{postgres=X/postgres}` only.

Root cause: cloud default privileges grant `EXECUTE` to `authenticated`/`service_role` on `CREATE FUNCTION`. Original RC4 only `REVOKE … FROM PUBLIC`.

## Policy

Direct `EXECUTE` forbidden for `PUBLIC`, `anon`, `authenticated`, and `service_role`.

Helpers are called only from SECURITY DEFINER top-level RPCs as function owner (`postgres`):

- `approve_partner_commission`
- `reject_partner_commission`
- `suspend_partner`
- `reactivate_partner`

No `service_role` grant (no direct call path).

## Migration

| Item | Value |
|---|---|
| File | `supabase/migrations/20260729130000_harden_admin_idempotency_helper_execute.sql` |
| SHA-256 | `E8FC2E0F3A6455EA2690885A8989BBAD9A5F0D154F310C74725436A426558B3E` |
| Signatures | `admin_idempotency_get(text,text)`, `admin_idempotency_put(text,text,uuid,text,uuid,jsonb)` |
| Actions | `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` per signature |
| Business logic | unchanged |
| Contract | remains `vdb-backend-contract@0.2.0-rc.4` / `2026.07.29.admin-control-surface-rc4` |

## ACL before → after (staging)

| Helper | Before | After |
|---|---|---|
| get | postgres + authenticated + service_role | `{postgres=X/postgres}` |
| put | postgres + authenticated + service_role | `{postgres=X/postgres}` |

`has_function_privilege` after apply: anon/authenticated/service_role all **false**.

## Verifier

`verify_admin_control_surface_contracts()` extended with ACL checks:

- anon/authenticated/service_role deny for get+put
- no unexpected grantees (only postgres; PUBLIC forbidden)
- owner retains EXECUTE

**Counts:** **40 pass / 0 fail** (was 31 before hardening checks).

## Local gates

| Check | Result |
|---|---|
| `db reset --local` | exit 0 (applies through `20260729130000`) |
| verify | 40/40 |
| `vitest` contract unit | exit 0 |
| `tsx scripts/test-admin-control-surface-rc4.ts` | **37/37** (includes direct helper deny) |
| `git diff --check` (gate files) | exit 0 |

## Staging apply

| Step | Result |
|---|---|
| CLI link | `qzekuvmgfekzsowdecyk` |
| Pending before push | exactly `20260729130000` |
| `db push --linked --yes` | exit 0 — only that file |
| Tip after | `20260729130000` |
| verify | 40/40 |

## Production safety (read-only)

| Check | Result |
|---|---|
| Ref | `nhsrdnjfsxfikfbdmdfj` |
| `202607291*` migrations | absent |
| `admin_rpc_idempotency` table | absent |
| Helpers | absent |

## Open blockers

None for this ACL issue.
