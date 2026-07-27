# RC2 financial concurrency validation

**Date:** 2026-07-27  
**Branch:** `test/rc2-concurrency-validation`  
**Base:** `c6ef0f57837358d392d89484016a1b7705a6bae1`  
**Verdict:** `RC2 FINANCIAL CONCURRENCY VALIDATION FAIL`

## Architecture

- Separate `psql` sessions inside `supabase_db_vdbdigital2` (one connection per concurrent actor)
- File-based start barrier (`touch READY`) so workers start together
- JWT via same-statement `FROM (SELECT set_config(..., true))` (transaction-local config)
- Synthetic actors only (`*.conc@example.invalid`); local `partner_payouts` flag enabled for tests and restored to `false`

Run:

```bash
npx tsx scripts/test-rc2-financial-concurrency.ts
```

## Results (full suite, two runs)

| Metric | RUN1 | RUN2 |
| --- | ---: | ---: |
| Scenarios | 18 | 18 |
| Failed scenarios | 4 | 4 |
| Iterations | 296 | 296 |
| Concurrent calls | 775 | 775 |
| Unexpected errors | 0 | 0 |
| Invariant failures | 95 | 95 |

### Passing races

- Sale confirm same idempotency key + fan-out
- Commission via parallel same-key confirm
- Payout request same idempotency key
- Dual-staff payout approval
- Dual/fan-out payout paid
- Refund vs paid + dual refund
- Cash receipt (same key, conflicting amount, fan-out)
- Ledger immutability
- Payout vs suspension (staff-revocation subcase UNPROVEN)

### Failing races (P0)

1. **Different idempotency keys / same lead** — `confirm_partner_sale` creates **two sales + two commissions** (lead `FOR UPDATE` does not enforce single conversion; no `UNIQUE(partner_lead_id)`).
2. **Dual-staff lead conversion** — same defect.
3. **Overlapping payout requests (60%+60%)** — available liability **overspent** (check-then-insert without lock).
4. **Payout request fan-out** — same overspend.

Machine-readable: `docs/audits/VDB_RC2_CONCURRENCY_RESULTS.json`  
Evidence log: `docs/evidence/rc2-concurrency-validation/full-suite.log`

## RC2 freeze advice

**Do not freeze RC2** until the two P0 defects are remediated in an authorized follow-up (migrations/RPC changes — out of scope for this gate).

## Non-changes confirmed

No migrations, RPCs, RLS, contracts, or dependencies were modified by this validation.
