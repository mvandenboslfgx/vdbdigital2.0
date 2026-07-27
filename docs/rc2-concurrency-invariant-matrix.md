# RC2 concurrency invariant matrix

| Process | RPC | Protections | Concurrent classification (executable) |
| --- | --- | --- | --- |
| Sale confirm same key | `confirm_partner_sale` | Lead `FOR UPDATE`; `UNIQUE(idempotency_key)` + `ON CONFLICT`; commission unique; ledger soft-idempotency | **PASS** — one sale, one commission |
| Sale confirm different keys / same lead | `confirm_partner_sale` | Lead `FOR UPDATE` only; **no** `UNIQUE(partner_lead_id)` | **FAIL** — two sales + two commissions |
| Dual-staff lead conversion | `confirm_partner_sale` | Same as above | **FAIL** — same root cause |
| Commission creation | via confirm | `UNIQUE(partner_sale_id)` + idempotency | **PASS** when single sale |
| Payout request overspend | `request_partner_payout` | Snapshot liability check; **no row lock**; unique only on idempotency key | **FAIL** — reserved total can exceed available |
| Payout request same key | `request_partner_payout` | Soft SELECT + INSERT; unique; **no** `ON CONFLICT` / unique_violation handler | **PASS** after fixture cleanup (one row; loser may `23505`) |
| Payout request fan-out | `request_partner_payout` | Same TOCTOU | **FAIL** — overspend |
| Payout approval dual staff | `approve_partner_payout_request` | Request `FOR UPDATE`; `UNIQUE(payout_request_id)` | **PASS** |
| Payout paid dual/fan-out | `record_partner_payout_paid` | Payout `FOR UPDATE`; early return if PAID; ledger idempotency | **PASS** |
| Refund vs paid | `process_partner_refund_adjustment` + paid | Paid immutable trigger; adjustment idempotency | **PASS** |
| Dual refund same key | refund RPC | `UNIQUE(idempotency_key)` + `ON CONFLICT` | **PASS** |
| Cash receipt same/conflict/fan-out | `record_partner_cash_receipt` | Idempotency unique + `ON CONFLICT`; amount not updated on conflict | **PASS** |
| Ledger immutability | triggers | `partner_ledger_immutable`; deferred balance | **PASS** |
| Payout vs suspension | request + profile update | Status check at request start | **PASS** (historical request may commit first) |
| Staff authority revocation race | n/a | No temporal admin model | **UNPROVEN** (non-blocking limitation) |

## Severity of failures

| Defect | Severity | Invariant violated |
| --- | --- | --- |
| Duplicate sale/commission per lead under distinct idempotency keys | **P0** | one sale / one commission per business event |
| Concurrent payout requests overspend available liability | **P0** | payout cap / non-negative available liability |

## Remediation direction (separate authorized change — not in this gate)

1. **Sale/lead:** After `FOR UPDATE` on lead, reject if already `CONVERTED` / `converted_sale_id IS NOT NULL`, and/or add `UNIQUE(partner_lead_id)` (or partial unique where converted). Ensure loser returns `EXPECTED_ALREADY_PROCESSED`.
2. **Payout request:** Lock partner row or use advisory lock / `SELECT … FOR UPDATE` on liability source before check+insert; handle `unique_violation` like ledger soft-idempotency; optionally defer capacity check to constraint/trigger.
