# Staging Object Diff — RC4 Pre-Auth Apply

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Staging ref:** `qzekuvmgfekzsowdecyk`
**Audit:** read-only inventory after early `db push` of `20260729120000` + `20260729120100`
**Tip after apply:** `20260729120100`

Classification legend: `correct` | `incomplete` | `unsafe` | `unexpected` | `unknown`

---

## Summary

| Class | Count | Notes |
|---|---|---|
| correct | majority of public admin RPCs + helpers intent | shapes, SECURITY DEFINER, search_path, anon deny |
| unsafe | **2** | `admin_idempotency_get`, `admin_idempotency_put` — staging EXECUTE for `authenticated` |
| incomplete | **1** | `verify_admin_control_surface_contracts` — 31/31 but misses helper-grant check |
| unexpected | 0 new unnamed objects beyond RC4 set | |
| unknown | 0 | |

**Overall object surface:** explained, but **not safe to resume mutation testing** until helper grants match local.

---

## Table

| Object | Mark |
|---|---|
| `admin_rpc_idempotency` | **correct** — RLS deny policies; table privileges revoked from anon/authenticated; anon SELECT privilege false |

---

## Enum

| Object | Mark |
|---|---|
| `partner_commission_status.REJECTED` | **correct** on staging; **absent** on production |

---

## Helpers

| RPC | Signature | Returns | SECURITY DEFINER | search_path | Execute grants (staging) | Revoke status | Tables/views | Capability | AAL2 | Audit | Idempotency | Feature flag | Payout impact | Mark |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `is_admin_or_owner` | `()` | `boolean` | yes | `public` | anon **deny**; authenticated/service **allow** | REVOKE PUBLIC + GRANT auth/service | staff role tables | OWNER/ADMIN only | n/a | n/a | n/a | n/a | none | **correct** |
| `require_aal2` | `()` | `void` | yes | `public` | anon deny; auth/service allow | same | JWT claims | n/a | enforces | n/a | n/a | n/a | none | **correct** |
| `admin_require_reason` | `(text)` | `text` | no (invoker) | `public` | auth/service allow | REVOKE PUBLIC | n/a | n/a | n/a | n/a | n/a | n/a | none | **correct** |
| `admin_idempotency_get` | `(text,text)` | `jsonb` | yes | `public` | staging ACL `{postgres,authenticated,service_role}`; **local** `{postgres}` only | migration REVOKE PUBLIC only — **insufficient on cloud** | `admin_rpc_idempotency` | none inside | none | none | yes | n/a | none direct | **unsafe** |
| `admin_idempotency_put` | `(text,text,uuid,text,uuid,jsonb)` | `void` | yes | `public` | same as get | same gap | `admin_rpc_idempotency` | none inside | none | none | writes store | n/a | none direct | **unsafe** |

**Risk:** any authenticated client can call put/get directly on staging (SECURITY DEFINER), bypassing the intended “internal only” boundary. Local reset does not show this grant.

---

## Public admin RPCs

Common pattern unless noted: `SECURITY DEFINER`, `search_path=public`, anon EXECUTE **false**, authenticated EXECUTE **true**, capability via `is_admin_or_owner` (or staff read gate per RPC), comments document PII/money boundaries.

| RPC | Signature | Returns | Capability | AAL2 | Audit | Idempotency | Feature flag | Payout impact | Mark |
|---|---|---|---|---|---|---|---|---|---|
| `admin_dashboard_stats` | `()` | `jsonb` | staff admin surface | no (read) | no | n/a | n/a | counts payout requests only; no mutate | **correct** |
| `admin_work_queue` | `(int,timestamptz,text[])` | `jsonb` | staff | hint only | no | n/a | n/a | none | **correct** |
| `approve_partner_commission` | `(uuid,text,text)` | `jsonb` | OWNER/ADMIN | **yes** | `audit_logs` | key required | n/a | posts `COMMISSION_ACCRUAL` only; **no payout mutate** | **correct** |
| `reject_partner_commission` | `(uuid,text,text)` | `jsonb` | OWNER/ADMIN | **yes** | yes | key required | n/a | status→REJECTED; **no ledger/payout** | **correct** |
| `suspend_partner` | `(uuid,text,text)` | `jsonb` | OWNER/ADMIN | **yes** | yes | key required | n/a | sets `payout_eligible=false`; closes lead/payout paths via ACTIVE check | **correct** |
| `reactivate_partner` | `(uuid,text,text)` | `jsonb` | OWNER/ADMIN | **yes** | yes | key required | n/a | restores eligibility; no payout execute | **correct** |
| `admin_list_products` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_list_partners` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_list_customers` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_list_projects` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_list_quotes` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_list_invoices` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | read-only | **correct** |
| `admin_list_appointments` | `(int,timestamptz,text)` | `jsonb` | staff | no | no | n/a | n/a | none | **correct** |
| `admin_get_settings_summary` | `()` | `jsonb` | staff | no | no | n/a | booleans only | none | **correct** |
| `admin_get_security_status` | `()` | `jsonb` | staff | reports AAL | no | n/a | n/a | none | **correct** |
| `verify_admin_control_surface_contracts` | `()` | `TABLE(...)` | service/staff as granted | n/a | n/a | n/a | n/a | money-boundary checks present; **helper EXECUTE not asserted** | **incomplete** |

---

## Contract-drift / rewritten

| RPC | Notes | Mark |
|---|---|---|
| `transition_portal_support_ticket` | Deprecated alias → `transition_portal_support_ticket_status`; SECURITY DEFINER; no independent logic | **correct** |
| `transition_portal_support_ticket_status` | Canonical | **correct** |
| `confirm_partner_sale` | Rewritten: PENDING commission, **no** ledger accrual | **correct** (intentional RC4 money-boundary move) |

---

## Read-only functional notes (no mutations)

- Staging verify: **31/31** (does not catch helper grants).
- Anon deny proven for dashboard stats + approve commission + idempotency table SELECT.
- Customer/Partner role deny for read RPCs: not JWT-impersonated in this audit; rely on `is_admin_or_owner` / staff gates inside DEFINER functions + prior local matrix 27/27.
- No PII fields advertised in comments for directory RPCs.
- No new payout approve/reject activation.

---

## Blocking object detail (staging ACL)

```text
admin_idempotency_get  ACL = {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
admin_idempotency_put  ACL = {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

Local after `db reset --local`:

```text
admin_idempotency_* ACL = {postgres=X/postgres}
```

Root cause: `REVOKE ALL … FROM PUBLIC` without explicit `REVOKE … FROM authenticated` / without `GRANT` only to postgres, under cloud default privileges that grant EXECUTE on new functions to `authenticated`.

---

## Repair direction (NOT executed)

Authorized additive migration only, after Owner approval:

1. `REVOKE ALL ON FUNCTION public.admin_idempotency_get(text,text) FROM PUBLIC, anon, authenticated;`
2. Same for `admin_idempotency_put(...)`.
3. Extend `verify_admin_control_surface_contracts` to assert helper EXECUTE is false for anon+authenticated.
4. Re-run read-only grant probe; then negative matrix / functional tests may resume.
