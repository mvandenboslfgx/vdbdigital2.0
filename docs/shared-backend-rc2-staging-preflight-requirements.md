# Shared backend RC2 staging preflight requirements

Staging project: **VDB Digital Staging** (`qzekuvmgfekzsowdecyk`).

This clean-room freeze does **not** authorize staging apply, remote SQL, or linked validation.

## Required before any authorized staging apply

1. **Duplicate sales preflight** (counts only, no PII):

```sql
SELECT partner_lead_id, count(*)
FROM public.partner_sales
WHERE partner_lead_id IS NOT NULL
GROUP BY partner_lead_id
HAVING count(*) > 1;
```

Expect 0 groups. Migration `20260724180000` fails closed if duplicates exist.

2. **Payout over-reservation preflight** (counts only): partners where sum of `REQUESTED` amounts exceeds `partner_available_liability_cents` (or equivalent read-only check).

3. **Migration gap inventory:** which of the 42 versions are already applied vs missing (especially concurrency `20260724180000` / `20260724190000`).

4. **RPC signature comparison** for `confirm_partner_sale` and `request_partner_payout`.

5. Explicit human authorization for remote apply (not the old exact-17 production apply).

## Classification vocabulary

- `STAGING_DATA_CLEAN`
- `STAGING_DUPLICATE_SALES_PRESENT`
- `STAGING_PAYOUT_OVERRESERVATION_PRESENT`
- `STAGING_PREFLIGHT_BLOCKED`

Current clean-room status: staging read-preflight was **blocked** (credentials lack staging project access). Re-run under authorized staging credentials later.

## Production denylist

Production `nhsrdnjfsxfikfbdmdfj` must not receive these migrations under this freeze. Exact-17 does not authorize RC2.
