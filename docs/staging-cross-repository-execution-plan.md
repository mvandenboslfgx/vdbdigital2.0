# Staging Cross-Repository Execution Plan (Scenarios 1–10)

**Status:** 10/10 PLANNED  
**Environment:** Shared staging only (not local-only stacks)  
**Blockers:** Partner scenarios 4–6, 8–9 require canonical partner schema (see gap register)

---

## Shared preconditions

- Staging project provisioned; migrations applied; contract `0.1.0` pinned  
- `APP_ENV=staging`; checkout false; P05 unset; Mollie live absent  
- Test accounts/fixtures from account plan  
- Evidence folder: `docs/evidence/staging-cross-repo-YYYY-MM-DD/` (gitignored)

---

## Scenario 1 — Website register → Mobile same account

| Field | Value |
|-------|--------|
| Actors | cust_a |
| Repos | Website, Mobile |
| Actions | Register/invite+activate on web; login Mobile |
| DB mutation | One `auth.users` + profile; membership |
| UI | Both sessions valid |
| RLS | Cust sees only own org |
| PASS | Same user id; no duplicate profile |
| Cleanup | Soft reset users or full fixture reset |

## Scenario 2 — Mobile request → Website admin

| Field | Value |
|-------|--------|
| Actors | cust_a, staff/admin |
| Actions | Customer creates support/project action in Mobile; admin opens web |
| DB | Single shared row |
| PASS | Same id in both UIs; audit/timestamp present |
| Note | Prefer support ticket or project feedback — objects that **exist** today |

## Scenario 3 — Admin project update → Mobile

| Field | Value |
|-------|--------|
| Actors | admin_a, cust_a |
| Actions | Admin updates `portal_projects` field; customer refreshes Mobile |
| PASS | Same values; no client-side admin authority on Mobile |
| RLS | Customer cannot write staff-only fields |

## Scenario 4 — Partner registers lead (Portal)

| Field | Value |
|-------|--------|
| Actors | part_a |
| **BLOCKED until** | partner + leads (partner-scoped) canonical |
| PASS (when ready) | Ownership; isolation; validation; no duplicate |

## Scenario 5 — Admin handles lead (Web)

| Field | Value |
|-------|--------|
| Actors | admin_a |
| **BLOCKED until** | Scenario 4 objects |
| PASS | Central status transition + audit |

## Scenario 6 — Sale status Portal = Mobile

| Field | Value |
|-------|--------|
| Actors | part_a |
| **BLOCKED until** | sales table canonical |
| PASS | Identical record id + status; no mobile-only clone |

## Scenario 7 — Customer payment server-confirmed

| Field | Value |
|-------|--------|
| Actors | cust_a, system webhook |
| Preconditions | Staging Mollie **test**; checkout may remain false until separate staging activation |
| PASS | Idempotent webhook/RPC; order/payment consistent; no client authority |
| Note | Can be deferred behind staging checkout gate; still designed here |

## Scenario 8 — Exactly one commission

| Field | Value |
|-------|--------|
| **BLOCKED until** | commissions + calculation RPC |
| PASS | Server-side calc; duplicate prevented; one row |

## Scenario 9 — Payout status identical

| Field | Value |
|-------|--------|
| **BLOCKED until** | payout_requests |
| PASS | Same status Portal + Mobile; no double payout |

## Scenario 10 — RLS isolation

| Field | Value |
|-------|--------|
| Actors | cust_a vs cust_b; part_a vs part_b; anon; cross-role |
| Actions | Direct REST + RPC + Storage signed URL attempts |
| PASS | Cross-tenant denied; anon denied on private buckets |
| Runnable now | Customer/org/project/document paths **yes**; partner paths after schema |

---

## Evidence per scenario

Record: date, staging ref (not secret), schemaVersion, actor ids (synthetic), PASS/FAIL, query counts (no PII), screenshots without secrets.
