# Quotes & Acceptance Architecture

## Canonical model

**Table:** `portal_quotes` (extended).  
Do **not** create a second quote/proposal model.

Related tables:

| Table | Role |
|-------|------|
| `portal_quote_items` | Line items (minor units + tax basis points) |
| `portal_quote_versions` | Immutable sent snapshots |
| `portal_quote_acceptances` | Acceptance/decline records |
| `portal_files` | Optional QUOTE document link (`document_id`) |

## Status lifecycle

`DRAFT` → `IN_REVIEW` → `READY` → `SENT` → `VIEWED` → `ACCEPTED` | `DECLINED`  
Also: `EXPIRED`, `WITHDRAWN`, `SUPERSEDED`, `ARCHIVED`.

Rules:

- Customers never see `DRAFT` / `IN_REVIEW` / `READY`
- **Send is READY-only** (`assertQuoteCanBeSent`) — DRAFT/IN_REVIEW never go straight to SENT
- Send creates an immutable version snapshot
- Accept/decline are terminal for that version
- Expiry is enforced on `valid_until` even if status not yet flipped
- Optional line selection is re-validated server-side before accept RPC

## Money

All amounts in **integer cents** (`*_cents`). Tax via **basis points** (`tax_rate_basis_points`).  
Source of truth: server + Postgres RPC recalculation — not client floats.

## Acceptance meaning

**Digitale offerteacceptatie** — a recorded customer decision.  
Not a qualified electronic signature. No Mollie, no payment, no auto-invoice.

## Out of scope

- Checkout / Mollie
- Automatic project or invoice creation after accept
- Fake PDF storage when PDF engine unavailable (print HTML preview instead)
