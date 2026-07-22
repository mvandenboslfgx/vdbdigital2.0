# Shared Partner Test Plan

## Commands (local only)

```bash
npx supabase db reset --yes   # project_id vdbdigital2 only
npx tsx scripts/verify-partner-backend.ts
npm run env:scan-secrets
npm run test:access-control
```

## Coverage

| Suite | Covers |
|-------|--------|
| Clean DB reset | Full migration chain exit 0 |
| verify_partner_admin_contracts | Tables, RPCs, RLS flags |
| Scenarios 4–6, 8–9 | Application→lead→sale→commission→payout |
| Scenario 10 | Partner A/B, customer, anon |
| Financial | Balance, idempotency, double payout block, refund-after-payout |
| Regression | Existing unit/access suites + checkout false |

## Fixtures

Synthetic `*.example.invalid` emails only; deterministic UUIDs; idempotent reset in verify script.
