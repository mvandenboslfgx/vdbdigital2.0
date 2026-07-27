# RC2 financial concurrency remediation

**Date:** 2026-07-27  
**Branch:** `fix/rc2-financial-concurrency-remediation`  
**Base:** `89721b9c2edfcabe4f2f89af22a2cee6791b2afa`  
**Verdict:** `RC2 FINANCIAL CONCURRENCY REMEDIATION PASS`  
**Readiness:** `RC2_READY_FOR_LOCAL_FREEZE`

## Root causes

| P0 | Defect | Fix |
| --- | --- | --- |
| P0-1 | Distinct idempotency keys on one lead → two sales/commissions | `UNIQUE(partner_lead_id)` + hardened `confirm_partner_sale` |
| P0-2 | Concurrent payout requests overspend available liability | `partner_profiles FOR UPDATE` then check+insert |

## Migrations

- `20260724180000_partner_sale_single_conversion_concurrency.sql`  
  SHA256 `f2a630755eb751c2ea52be32abfefca7cc133af7e89d109916bf9281004a4e9a`
- `20260724190000_partner_payout_liability_concurrency.sql`  
  SHA256 `b380d9fe768effa326e67b63ed001604dc19ef5f6e4fcc783151557f65e7fe46`

Migration count: **42**. Final: `20260724190000`. No RC3 messaging versions.

## Sale locking

1. Authenticate/authorize staff
2. `SELECT … FROM partner_leads … FOR UPDATE`
3. Existing sale same key → return id; different key → `PARTNER_LEAD_ALREADY_CONVERTED`
4. Insert sale + commission + ledger atomically; unique_violation → deterministic loser

`review_partner_lead` remains status-only (single conversion boundary).

## Payout serialization

1. Feature flag + auth + ACTIVE/payout_eligible
2. `SELECT … FROM partner_profiles WHERE user_id = auth.uid() FOR UPDATE`
3. Soft idempotency by key
4. `partner_available_liability_cents` (includes `REQUESTED` reservations)
5. Insert or `PARTNER_INSUFFICIENT_LIABILITY`

## Liability-reserving statuses

- `REQUESTED` — reserves
- `APPROVED` — via `partner_payouts` PENDING/PAID
- `REJECTED` — releases

## Concurrency proof

Two full runs after fix (with negatives): **594** iterations, **1582** concurrent calls, **0** unexpected, **0** invariant failures.

## Staging impact

`STAGING_PREFLIGHT_BLOCKED` — staging project not readable with current credentials. Production denylist not queried. No staging/production mutation. Apply later requires duplicate-sale + overspend preflight and separate authorization.

## Contract

- `contractVersion`: `vdb-backend-contract@0.2.0-rc.2` (`KEEP_RC2_VERSION`, unpublished)
- `schemaVersion`: `2026.07.27.financial-concurrency-rc2`

## Rollback

Forward-only migrations. Rollback would require a new compensating migration (not authorized here). Unique constraint removal would re-open P0-1.

## Boundaries

No push, tag, staging/production apply, Mollie live, checkout, or P05 activation.
