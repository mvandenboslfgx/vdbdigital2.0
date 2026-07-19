# Invoices & Financial Documents Architecture

## Canonical model

**Table:** `portal_invoices` (extended). Do not create a second invoice model.

| Table | Role |
|-------|------|
| `portal_invoice_items` | Line items (minor units + tax basis points) |
| `portal_invoice_versions` | Immutable issue snapshots |
| `portal_invoice_payment_records` | Manual payment registration (not Mollie) |
| `portal_files` | Optional INVOICE document link |

## Scope

- Staff manage and issue invoices
- Customers view/download customer-visible invoices
- Manual “Betaling registreren”
- Credit notes as `invoice_type = CREDIT_NOTE`

## Out of scope

- Mollie / checkout / payment links
- Automatic collection
- Full accounting package
- Fake PDF storage (print HTML until PDF engine exists)

## Quote link

Accepted quotes can seed a **DRAFT** invoice via explicit staff action only.
Acceptance never auto-creates an invoice.
