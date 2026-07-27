# RC2 concurrency test execution

## Command

```text
npx tsx scripts/test-rc2-financial-concurrency.ts
```

Optional debug (not freeze evidence): `CONC_QUICK=1`

## Harness files

| Path | Role |
| --- | --- |
| `scripts/concurrency/db.ts` | Parallel `psql` sessions + barrier + JWT helper |
| `scripts/concurrency/fixtures.ts` | Synthetic actors, cleanup, flag toggle |
| `scripts/test-rc2-financial-concurrency.ts` | Races 1–10, dual suite runs, JSON export |

## Iteration policy (full)

| Mode | Pairwise | Heavy | Fan-out |
| --- | ---: | ---: | ---: |
| Full | 20 | 25 | 5 × 10 |
| Quick | 3 | 3 | 1 × 4 |

## Full execution (2026-07-27)

| Run | Pass scenarios | Fail scenarios | Iterations | Concurrent calls | Invariant failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| RUN1 | 14 | 4 | 296 | 775 | 95 |
| RUN2 | 14 | 4 | 296 | 775 | 95 |

**Flakiness:** FAIL pattern identical across both full runs (not timing flake).

## Classification counts (product defects)

| Category | Count |
| --- | ---: |
| SUCCESS / IDEMPOTENT paths proven | majority of races |
| EXPECTED conflict/insufficient liability | present on overspend losers (when one fails) |
| INVARIANT_FAILURE (duplicate sale / overspend) | 95 per run |
| UNEXPECTED_ERROR | 0 |
| UNPROVEN | staff-authority revocation during mutation |

## Post-condition

`partner_payouts` feature flag restored to `false` after each suite run.
