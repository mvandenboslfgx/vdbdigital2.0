# P0.5 — Checkout Release Gate

**Status:** complete (code)  
**CHECKOUT_ENABLED:** must remain **false / unset**

```env
CHECKOUT_ENABLED=false
```

Missing variable also means OFF. This gate **never** enables checkout.

## Fase 1 — Stability audit (2026-07-16)

### Already correct in code

| Area | Notes |
| --- | --- |
| Checkout feature flag | `isDirectCheckoutEnabled()` only true when `CHECKOUT_ENABLED=true`; default OFF |
| Price modes | FIXED / STARTING_FROM / QUOTE_ONLY; from-price not checkoutable |
| MONTHLY/YEARLY | Blocked from one-time checkout |
| Legal B2B/B2C gate | Fail-closed via commercial catalog + `customerType` |
| Origin allowlist | Exact `URL.origin` match; Host not trusted |
| Mollie status map | paid/failed/canceled/expired/authorized/refunded/charged_back |
| Webhook claim/process | Mark PROCESSED after success; reclaim FAILED |
| Refund/chargeback after PAID | Allowed |
| Tawk hash route | 404 |
| WhatsApp misconfig UI | Hidden |

### Code-complete but needs deployment/config

| Area | Needs |
| --- | --- |
| Migration `20260716000000` + `20260716010000` | Apply to target Supabase |
| RPCs | `check_rate_limit`, `create_order_with_items`, `apply_mollie_payment_update` |
| Rate limiter | Upstash **or** DB RPC live + operator verify flags |
| EMAIL_FROM | Verified domain; set `EMAIL_ALLOWED_FROM_DOMAINS` |
| Mollie testmode E2E | Manual checklist below |
| Legally approved FIXED SKU | Real catalog approval (none live yet) |

---

## Manual external checklist

1. **Supabase**
   - Backup / point-in-time recovery note taken
   - Apply `20260716000000_p0_payment_integrity.sql`
   - Apply `20260716010000_p05_rate_limit_hardening.sql`
   - Run `npm run db:verify-p0-payments`
   - Set `P05_MIGRATION_APPLIED=1` and `P05_LIMITER_RPC_VERIFIED=1` only after PASS
2. **Limiter**
   - Prefer DB RPC (already in migration) **or** configure Upstash REST URL+token on Preview/Production
3. **Email**
   - Verify sender domain in Resend
   - Set production `EMAIL_FROM` to that domain (not `onboarding@resend.dev`)
   - Set `EMAIL_ALLOWED_FROM_DOMAINS`
4. **Mollie testmode**
   - Use `test_` API key only on local/preview
   - Configure webhook URL with token
   - Manually exercise: paid, failed, canceled, expired, authorized, refunded, charged_back
   - Confirm duplicate webhook + amount/currency mismatch rejection
   - Set `P05_MOLLIE_TEST_VERIFIED=1` only after checklist complete
5. **Legal FIXED SKU**
   - Approve one real FIXED one-time catalog item for B2B and/or B2C
   - Do **not** publish without legal sign-off

Then run: `npm run checkout:release-gate`

---

## Mollie testmode harness (automated vs manual)

| Status / scenario | Automated | Manual Mollie Dashboard |
| --- | --- | --- |
| open/pending/paid/failed/canceled/expired/authorized/refunded/charged_back map | unit | recommended |
| refund/chargeback after PAID | unit | required |
| duplicate webhook | unit | required |
| wrong amount / currency | unit + webhook route | required |
| live key on localhost | unit | n/a |
| real payment creation | — | required with `test_` key |
| webhook retry after DB fault | code path reclaim | recommended |

---

## Releasebesluit (code gate without live ops)

See end of this file after CI commands — typically **P0.5 CONDITIONAL PASS** until migrations + Mollie + legal SKU are operator-confirmed.

## Migration verification (first external gate)

1. Verifier in repo: `npm run db:verify-p0-payments`
2. Apply migrations only after backup (later), in order:
   - `20260716000000_p0_payment_integrity.sql`
   - `20260716010000_p05_rate_limit_hardening.sql`
   - `20260716020000_p05_verify_payment_contracts.sql`
3. Full fail-closed proof:

```bash
P05_VERIFY_BEHAVIORAL=1 P05_VERIFY_WRITE_EVIDENCE=1 npm run db:verify-p0-payments
```

4. Archive output with `docs/P0_5_MIGRATION_EVIDENCE_TEMPLATE.md`
5. Only then set `P05_MIGRATION_APPLIED=1`

Schema-only PASS is **not** enough for `P05_MIGRATION_APPLIED`.
`CHECKOUT_ENABLED` stays false.
