# Shared Partner Migration Plan

## Production boundary

Existing production apply baseline ends at `20260719170000_invoice_payment_reversal_integrity.sql`.  
These migrations are **not** part of the exact-17 manifest.

## Local chain (this branch)

| Version | File | Domain |
|---------|------|--------|
| 20260722100000 | partner_identity_roles | A — enums + partner_profiles + helpers |
| 20260722110000 | partner_applications_profiles_codes | B — applications + codes |
| 20260722120000 | partner_leads_and_sales | C — partner_leads/sales (not marketing leads) |
| 20260722130000 | partner_commissions_and_ledger | D — commissions + balanced ledger |
| 20260722140000 | partner_payouts | E — payout requests + payouts |
| 20260722150000 | partner_cash_receipts_adjustments | F — cash + adjustments |
| 20260722160000 | partner_rls_and_rpcs | G — RLS + RPCs + grants |
| 20260722170000 | partner_verify_contracts | H — verify RPC |

Rules: monotonic timestamps; no history repair; no rename of prior migrations; RLS with grants; verification at end.
