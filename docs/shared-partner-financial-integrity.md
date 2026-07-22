# Shared Partner Financial Integrity

## Invariants

1. One commission per `partner_sale` (`UNIQUE(partner_sale_id)` + idempotency key).
2. Ledger transactions are append-only; posted entries cannot UPDATE/DELETE.
3. Every ledger transaction balances (`SUM(debit) = SUM(credit)`), enforced by deferred constraint trigger.
4. Available liability = approved+paid commission cents − pending+paid payouts − open requests + adjustments, floored at 0.
5. Payout cannot exceed available liability at request or approve time.
6. Paid payouts cannot change amount/status away from `PAID`.
7. Refund after payout creates compensating `partner_adjustments` + ledger entries; does not mutate paid payout history.
8. Clients never write ledger, commissions, or payout approval totals — SECURITY DEFINER RPCs only.
9. Cash receipts require staff (`is_staff_admin`) + idempotency.

## Calculation

Default rule `v1_flat_bps`: `amount_cents = gross * rate_bps / 10000` (server-side in `confirm_partner_sale`).
