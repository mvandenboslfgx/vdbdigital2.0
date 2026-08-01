# Staging Functional RPC Tests — Admin Control Surface RC4

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Staging tip:** `20260729130000`
**Contract:** `vdb-backend-contract@0.2.0-rc.4` / `schemaVersion` `2026.07.29.admin-control-surface-rc4`
**Command:** `npx supabase db query --linked -f scripts/staging-admin-control-surface-rc4-matrix.sql`
**Aggregate:** **27 pass / 0 fail**

## Read RPCs

| Test | Result |
|---|---|
| `admin_dashboard_stats` staff success + schema_version pin | PASS |
| `admin_work_queue` admin success | PASS |
| `admin_list_products` staff | PASS |
| `admin_get_settings_summary` (no secrets) | PASS |
| `admin_get_security_status` AAL1 → `step_up_required` | PASS |

## Mutations

| Test | Result |
|---|---|
| commission approve admin AAL2 | PASS (`status=approved`) |
| same idempotency key replay | PASS |
| commission reject owner AAL2 | PASS (`status=rejected`) |
| audit row for commission | PASS |
| suspend partner admin AAL2 | PASS → status `SUSPENDED` |
| reactivate owner AAL2 | PASS (`status=active`) |

## Idempotency

- First approve with key succeeds.
- Replay with same key returns approved (cached).
- Helpers not writable by clients when denied (row count stable).

## AAL2

- Admin AAL1 approve/suspend → `AAL2_REQUIRED`.
- Admin/owner AAL2 → success paths above.

## Payout

- Verify check `no_payout_mutation_added` still true.
- No payout approve/reject/paid exercised or activated.

## Ticket alias

- `transition_portal_support_ticket` present (deprecated alias).

## Production

Untouched — see `IDEMPOTENCY_HELPER_ACL_HARDENING.md` production section.
