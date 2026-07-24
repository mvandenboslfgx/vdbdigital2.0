# Contract convergence diff — Mobile 0.1.1 → Owner 0.2.0-rc.2

**Date:** 2026-07-24
**Owner:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)
**Decision:** Do **not** publish owner `0.1.0` or Mobile `0.1.1`. Base = owner `0.2.0-rc.1`. Target = `0.2.0-rc.2` / `2026.07.24.mobile-compat-rc2`.

## Diff summary (owner rc.1 vs Mobile d701377 / 0.1.1)

| Area | Owner rc.1 (canonical) | Mobile 0.1.1 (proposal only) | rc.2 choice |
|---|---|---|---|
| Projects | `portal_projects` | `projects` | Canonical `portal_projects`; Mobile maps |
| Quotes | `portal_quotes` + `accept_portal_quote` | `quotes` + `accept_quote` | Canonical portal; client adapter |
| Invoices | `portal_invoices` | `invoices` | Canonical portal; client adapter |
| Documents | `portal_files` + multi buckets | `documents` + bucket `documents` | Canonical portal_files + existing 6 buckets |
| Profiles | `profiles` + `organization_members` | `app_profiles` + `user_roles` | Canonical owner identity; Mobile must adapt |
| Partner leads | `partner_leads` | `partner_leads` (+ alias `leads`) | Same table; **forbid** aliasing marketing `leads` |
| Commissions/payouts | `partner_commissions`, `partner_payout_requests`, ledger | `commissions`, `payout_requests` | Canonical partner_*; Mobile maps |
| Partner lead RPC | `create_partner_lead` | `register_partner_lead` | Canonical create_*; adapter required |
| Payout RPC | `request_partner_payout(amount, idempotency)` | `request_commission_payout(uuid[])` | Canonical amount model; adapter required |
| Flags | `CHECKOUT_ENABLED` (env) | `mollie_checkout`, `partner_payouts`, … | Keep env for web; add DB `feature_flags` fail-closed |
| Appointments / mobile admin RPCs | Absent | Present in Mobile proposal | **Deferred** — not in rc.2 schema |

## Feature-flag mapping

| Mobile / shared DB key | Owner meaning |
|---|---|
| `mollie_checkout` | Aligns with fail-closed checkout (`CHECKOUT_ENABLED` env for web) |
| `digital_product_checkout` | Fail-closed digital goods |
| `partner_payouts` | Gates `request_partner_payout` |
| Legacy `payments.*` / `partner.payouts` | Aliases only; remain false |

## Minimum client compatibility

- Clients must pin `>=0.2.0-rc.2`
- Partner surface from rc.1 remains embedded and non-breaking
- Mobile must not claim `0.1.1` as canonical

## Owner migrations required for rc.2

| File | Purpose |
|---|---|
| `supabase/migrations/20260724160000_mobile_compat_rc2.sql` | `feature_flags`, `feature_flag_enabled`, payout flag gate, `verify_mobile_compat_contracts` |

No changes to partner ledger/commission/payout table definitions beyond the payout RPC fail-closed flag check.
