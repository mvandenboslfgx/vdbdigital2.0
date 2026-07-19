# Invoices Financial Status Flow

Issue is **READY-only** (`assertInvoiceCanBeIssued`).

Allowed (staff / payment-driven):

- DRAFT ↔ IN_REVIEW → READY
- READY → OPEN (issue atomic; sets issued_at, snapshot)
- OPEN → PARTIALLY_PAID / PAID / OVERDUE / CANCELED
- PARTIALLY_PAID → PAID / OVERDUE
- OVERDUE → PARTIALLY_PAID / PAID
- … → CREDITED via credit note workflow
- → ARCHIVED when operationally allowed

Blocked:

- DRAFT/IN_REVIEW → ISSUED/OPEN
- CANCELED → PAID
- CREDITED → OPEN
- PAID without amount_due = 0

Overdue is also **derived** from `due_date` + `amount_due_cents` even if status not yet flipped.

## Manual payment reversal (`reverse_portal_invoice_payment`)

Administrative correction only — **not** a Mollie/provider refund. Payment rows are never deleted.

After reversal, totals are recomputed server-side:

- `amount_paid_cents` = sum of rows where `reversed_at IS NULL`
- `amount_due_cents` = `GREATEST(total_cents - amount_paid_cents, 0)` (overpayment floor)

Status:

| Result | Condition |
|--------|-----------|
| PAID | amount_due = 0 |
| PARTIALLY_PAID | amount_paid > 0 and amount_due > 0 |
| OVERDUE | amount_paid = 0, amount_due > 0, due_date past |
| OPEN | amount_paid = 0, amount_due > 0, due_date not past (incl. former ISSUED/PAID) |

Fail-closed (no silent reopen):

- **CANCELED / CREDITED / ARCHIVED** → `STATUS_LOCKED`
- **CREDIT_NOTE** invoices → `CREDIT_NOTE_LOCKED`
- **DRAFT / IN_REVIEW / READY** → `STATUS_INVALID`

Requires OWNER/ADMIN (`can_reverse_invoice_payment` + app permission `invoices.reverse_payment`).
Idempotent via unique `reversal_idempotency_key`.
