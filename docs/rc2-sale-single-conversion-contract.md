# RC2 sale single-conversion contract

## Invariant

A `partner_leads` row may attach to **at most one** canonical `partner_sales` row, regardless of idempotency key, staff actor, client, or timing.

Leadless sales (`partner_lead_id IS NULL`) remain allowed (Postgres UNIQUE permits multiple NULLs).

## Enforcement

1. Constraint `partner_sales_one_per_lead UNIQUE (partner_lead_id)`
2. `confirm_partner_sale`:
   - `SELECT … FROM partner_leads … FOR UPDATE`
   - If sale exists for lead with same idempotency key → return existing id
   - If sale exists with different key → `PARTNER_LEAD_ALREADY_CONVERTED`
   - Insert under unique constraint with `unique_violation` handler
3. `review_partner_lead` remains status-only (no sale creation)

## Loser outcome

Deterministic exception `PARTNER_LEAD_ALREADY_CONVERTED` (not a raw 500).
