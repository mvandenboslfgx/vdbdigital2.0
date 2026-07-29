# Staging Negative Matrix — Admin Control Surface RC4

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Staging ref:** `qzekuvmgfekzsowdecyk`
**Runner:** `npx supabase db query --linked -f scripts/staging-admin-control-surface-rc4-matrix.sql`
**Result:** **27 pass / 0 fail** (exit 0)
**Raw output:** `_tmp_staging_matrix.out.txt`

Synthetic `@example.invalid` identities only; best-effort cleanup after run.

## Roles covered

| Role | Coverage |
|---|---|
| anon | helper direct deny; (dashboard anon covered in local matrix + privilege probes) |
| customer | stats deny; directory deny |
| Partner active | stats deny; suspended lead deny after suspend |
| Partner pending / suspended | seeded; lead path exercised via suspended active partner |
| staff (SUPPORT) | stats/queue/dir/settings success; commission/suspend mutation deny |
| admin | AAL1 deny on mutations; AAL2 success approve/suspend |
| owner | reject + reactivate AAL2 success |

## Negative checks

| Name | Expected | Result |
|---|---|---|
| `acl:helpers_client_deny` | no EXECUTE for anon/auth/service_role | PASS |
| `helper_get:authenticated_direct` | permission denied | PASS |
| `helper_get:anon_direct` | permission denied | PASS |
| `helper:no_row_on_deny` | idempotency row count unchanged | PASS |
| `stats:customer_deny` | FORBIDDEN | PASS |
| `stats:partner_deny` | FORBIDDEN | PASS |
| `dir:customer_deny` | FORBIDDEN | PASS |
| `commission:staff_deny` | FORBIDDEN | PASS |
| `commission:aal1_deny` | AAL2_REQUIRED | PASS |
| `suspend:staff_deny` | FORBIDDEN | PASS |
| `suspend:aal1_deny` | AAL2_REQUIRED | PASS |
| `lead:suspended_deny` | FORBIDDEN/AUTH_REQUIRED | PASS |
| `payout:mutations_unchanged_boundary` | verify money boundary OK | PASS |

## Isolation notes

- Partner/customer cannot call admin directory/stats (FORBIDDEN inside DEFINER).
- Helpers not client-callable (ACL).
- No client `service_role` usage in tests.
- No real PII in fixtures.

## Local companion matrix

`scripts/test-admin-control-surface-rc4.ts` → **37/37** including helper deny for customer/partner/staff/admin/anon.
