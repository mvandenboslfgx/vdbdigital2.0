# Shared Partner RPC Contract

**contractVersion:** `vdb-backend-contract@0.2.0-rc.1`  
**schemaVersion:** `2026.07.22.partner-rc1`

## RPCs

| RPC | Actor | Purpose |
|-----|-------|---------|
| `submit_partner_application` | authenticated user | Create/update open application + PENDING profile |
| `review_partner_application` | staff | Approve→ACTIVE+code / Reject |
| `create_partner_lead` | active partner | Create attributed lead |
| `review_partner_lead` | staff | Status transition |
| `confirm_partner_sale` | staff | Sale + commission + ledger accrual |
| `request_partner_payout` | active payout-eligible partner | Cap by available liability |
| `approve_partner_payout_request` | staff | Approve→payout row / Reject |
| `record_partner_payout_paid` | staff | Mark PAID + ledger payout |
| `record_partner_cash_receipt` | staff | Cash receipt + ledger |
| `process_partner_refund_adjustment` | staff | Compensating adjustment |
| `partner_financial_summary` | partner (own) / staff | Available + totals |
| `partner_available_liability_cents` | authenticated | Liability helper |
| `verify_partner_admin_contracts` | authenticated / service_role | Contract checks |

## Error codes (exception messages)

`AUTH_REQUIRED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_FAILED` · `CONFLICT` · `partner_ledger_unbalanced` · `partner_ledger_immutable` · `partner_payout_paid_immutable`

## SECURITY DEFINER

All mutation RPCs: fixed `search_path = public`, authZ inside function, minimal EXECUTE grants to `authenticated`. Internal `_partner_post_ledger` not granted to PUBLIC/authenticated.
