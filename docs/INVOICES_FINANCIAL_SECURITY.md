# Invoices Financial Security

- `CHECKOUT_ENABLED=false`
- No Mollie calls from invoice flows
- No payment-provider IDs on invoice/payment-record tables
- Money in integer cents; server recalculates
- Private `invoice-documents` bucket; short-lived signed URLs only
- Actor = `auth.uid()`; organization from row/membership
- Customers never mutate status or register payments
- Portal copy: “alleen factuurinzage” — no “Betaal nu”

Label manual registration: **Betaling registreren** (not “verwerken”).

## Payment reversal

- RPC `reverse_portal_invoice_payment` is transactional, permission-gated (OWNER/ADMIN), version-locked
- Original amount/date/method/`recorded_by` are immutable; rows are never deleted
- Internal `reversal_reason` is staff-only — never shown in the customer portal
- No Mollie call, no provider refund record, no checkout
