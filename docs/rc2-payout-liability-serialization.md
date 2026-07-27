# RC2 payout liability serialization

## Liability-reserving statuses

| Status | Reserves liability | Notes |
| --- | --- | --- |
| `REQUESTED` | yes | Subtracted in `partner_available_liability_cents` |
| `APPROVED` | via payout row | Request no longer counted; `partner_payouts` PENDING/PAID count |
| `REJECTED` | no | |

No CANCELLED/EXPIRED in current enum.

## Serialization

`request_partner_payout`:

1. Feature flag + auth
2. `SELECT * FROM partner_profiles WHERE user_id = auth.uid() FOR UPDATE`
3. Soft idempotency by key
4. Compute `partner_available_liability_cents`
5. If `amount > available` → `PARTNER_INSUFFICIENT_LIABILITY`
6. Insert request; `unique_violation` → return existing key

Different partners do not share the same row lock.
