# P0.5 Git baseline (Step 0)

| Field | Value |
| --- | --- |
| Date (UTC) | 2026-07-16 |
| Commit | `7cffba77b00d6ab404d45ba4fee4b3c2ab37f729` |
| Short | `7cffba7` |
| Tag | `p0.5-pre-migration-2026-07-16` |
| Message | `chore: baseline before P0.5 database migration` |
| Checkout | `CHECKOUT_ENABLED` unset / false |
| `P05_MIGRATION_APPLIED` | not set |

## Excluded from commit

- `.env*` (except `.env.example`)
- `/docs/evidence/`
- `VDB-Digital-Software-Review-Package.zip`
- `/review-package/`
- `/test-results/`
- dump/backup artifacts

## Migration SHA256 at this commit

```text
F9573FFF47F77A9420B20BD83AD8BA5373CFB3050B84540F5DF6B72DDFC85674  20260716000000_p0_payment_integrity.sql
84C4E29469A1225498106C0C2BB45EF56FE2B6EBDE8FBE4D009041D94F10391E  20260716010000_p05_rate_limit_hardening.sql
47E3300FF50BB4A713411EE5454DBD60407FA07E546B1D0964D349B24AA900D4  20260716020000_p05_verify_payment_contracts.sql
```

## Next gate

Docker Desktop + local Supabase dry-run (or separate staging project). No production migrate until dump→restore→migrate→behavioral PASS.
