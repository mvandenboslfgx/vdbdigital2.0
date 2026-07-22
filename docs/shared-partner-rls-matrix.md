# Shared Partner RLS Matrix

| Table | Partner (own ACTIVE) | Partner B | Customer | Anon | Staff (`is_staff_admin`) |
|-------|----------------------|-----------|----------|------|--------------------------|
| partner_applications | SELECT/UPDATE own open | deny | deny | no GRANT | ALL |
| partner_profiles | SELECT own | deny | deny | no GRANT | ALL |
| partner_codes | SELECT own | deny | deny | no GRANT | ALL |
| partner_leads | SELECT own | deny | deny | no GRANT | ALL |
| partner_sales | SELECT own | deny | deny | no GRANT | SELECT (RPC writes) |
| partner_commissions | SELECT own | deny | deny | no GRANT | SELECT |
| partner_payout_requests | SELECT own | deny | deny | no GRANT | SELECT |
| partner_payouts | SELECT own | deny | deny | no GRANT | SELECT |
| partner_ledger_entries | SELECT own partner_id | deny | deny | no GRANT | SELECT |
| partner_ledger_transactions | deny | deny | deny | no GRANT | SELECT |
| partner_cash_receipts | SELECT if partner_id own | deny | deny | no GRANT | SELECT |
| partner_adjustments | SELECT own | deny | deny | no GRANT | SELECT |

Mutations of financial tables: **RPC only** (no authenticated INSERT/UPDATE/DELETE grants on financial tables).

Proven locally via `scripts/verify-partner-backend.ts` (Partner A/B isolation, customer denial, anon privilege denial).
