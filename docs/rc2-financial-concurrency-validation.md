# RC2 financial concurrency validation

**Date:** 2026-07-27  
**Branch:** `fix/rc2-financial-concurrency-remediation`  
**Base:** `89721b9c2edfcabe4f2f89af22a2cee6791b2afa`  
**Prior FAIL evidence:** preserved under `docs/evidence/rc2-concurrency-validation/` and commit `89721b9`

## Architecture

- Separate `psql` sessions inside `supabase_db_vdbdigital2` (one connection per concurrent actor)
- File-based start barrier (`touch READY`) so workers start together
- JWT via same-statement `FROM (SELECT set_config(..., true))` (transaction-local config)
- Synthetic actors only (`*.conc@example.invalid`); local `partner_payouts` flag enabled for tests and restored to `false`
- Negative contracts: `RACE11_NEGATIVE_CONTRACTS` (error codes, direct INSERT denial, liability edge cases)

Run:

```bash
npx tsx scripts/test-rc2-financial-concurrency.ts
```

## Remediation results (full suite, two runs)

See `docs/audits/VDB_RC2_CONCURRENCY_REMEDIATION_RESULTS.json` and `docs/audits/VDB_RC2_CONCURRENCY_RESULTS.json`.

Gate targets (minimum):

| Metric | Requirement |
| --- | ---: |
| Iterations | ≥ 592 |
| Concurrent calls | ≥ 1550 |
| Unexpected errors | 0 |
| Invariant failures | 0 |
| Duplicate sales | 0 |
| Payout overspends | 0 |

## Original P0 reproduction (pre-fix)

Both P0s reproduced before migrations applied (quick + dedicated scenarios).

## Loser outcomes (post-fix)

| Scenario | Winner | Loser |
| --- | --- | --- |
| Distinct idempotency keys / one lead | 1 sale + commission | `PARTNER_LEAD_ALREADY_CONVERTED` |
| Payout overspend | reservation ≤ available | `PARTNER_INSUFFICIENT_LIABILITY` |
| Same idempotency key | soft idempotent UUID | same UUID |

## Freeze advice

Local remediation PASS unlocks `RC2_READY_FOR_LOCAL_FREEZE` only. Tag/push/staging/production apply remain unauthorized until a separate gate.
