# Staging Backend Gap Register — Canonical Schema vs Shared Platform Needs

**Date:** 2026-07-22  
**Canonical HEAD:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`  
**Local proof:** `supabase_db_vdbdigital2` — 27 migrations, public tables inventoried  
**Rule:** No schema changes in this document — proposals only

---

## Summary

| Classification | Count |
|----------------|------:|
| CANONICAL_PRESENT (usable for shared staging v1 customer path) | many |
| CANONICAL_DIFFERENT_NAME | 2 |
| CLIENT_LOCAL_ONLY | 0 in this repo (siblings not scanned here) |
| BACKEND_PROPOSAL_REQUIRED | **11** |
| OUT_OF_SCOPE_V1 | 1 |

**Partner/finance shared path is not staging-ready** until proposals land in this repo.

---

## A. Auth / identity

| Object | Classification | Notes |
|--------|----------------|-------|
| `auth.users` | CANONICAL_PRESENT | Supabase Auth |
| `profiles` | CANONICAL_PRESENT | |
| `admin_roles` | CANONICAL_PRESENT | Staff/admin matrix |
| Role `customer` | CANONICAL_DIFFERENT_NAME | Via `organization_members`, not enum `customer` |
| Roles `partner` / `partner_pending` | **BACKEND_PROPOSAL_REQUIRED** | BCP-STAGING-001 |
| Roles `staff` / `admin` / `owner` | CANONICAL_DIFFERENT_NAME | Mapped via `admin_roles.role` + permissions — document mapping in contract |

### BCP-STAGING-001 — Partner roles

- **Need:** first-class partner identity (`partner_pending`, `partner`) enforceable in RLS  
- **Impact:** Auth, RLS, Mobile/Portal login routing  
- **Blocks scenarios:** 4–6, 8–10 (partner half)  
- **Financial:** none directly  

---

## B. Website / Mobile (customer path)

| Object | Classification |
|--------|----------------|
| `organizations`, `organization_members`, `organization_invitations` | CANONICAL_PRESENT |
| `portal_projects`, members, milestones, deliverables, actions, activity, feedback | CANONICAL_PRESENT |
| `portal_conversations`, participants, `portal_messages` | CANONICAL_PRESENT |
| `portal_support_tickets`, replies | CANONICAL_PRESENT |
| `portal_files`, download events | CANONICAL_PRESENT |
| `portal_quotes` + items/versions/acceptances + RPCs | CANONICAL_PRESENT |
| `portal_invoices` + items/versions/payments + RPCs | CANONICAL_PRESENT |
| `orders`, `payments`, `webhook_events` (web checkout) | CANONICAL_PRESENT |
| `portal_notifications` | CANONICAL_PRESENT |
| appointments | **OUT_OF_SCOPE_V1** (booking via external flags; no shared table required for scenarios 1–10) |
| reviews | **BACKEND_PROPOSAL_REQUIRED** if Mobile needs shared reviews — BCP-STAGING-011 (non-blocking for 1–10) |

---

## C. Partner domain (critical gaps)

| Object | Classification | Proposal | Blocks scenarios |
|--------|----------------|----------|------------------|
| `partner_applications` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-002 | 4 pre |
| `partner_profiles` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-003 | 4–6, 8–9 |
| `partner_codes` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-004 | 4, 8 |
| Partner-scoped `leads` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-005 | 4–5 |
| `sales` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-006 | 6, 8 |
| `commissions` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-007 | 8 |
| `payout_requests` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-008 | 9 |
| `marketing_assets` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-009 | none for 1–10 core |
| `cash_receipts` | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-010 | financial integrity |
| Shared ledger entries | BACKEND_PROPOSAL_REQUIRED | BCP-STAGING-010 | 8–9 |

### Important: existing `public.leads`

`leads` exists in `20260714000000_initial_schema.sql` as **marketing/contact lead capture** (website forms), **not** partner-attributed affiliate leads.  

**Classification:** CANONICAL_PRESENT (marketing) + **BACKEND_PROPOSAL_REQUIRED** for partner lead model (do not overload without explicit design) — BCP-STAGING-005.

---

## D. Proposal stubs (for backend-change-proposal-template)

| ID | Title | Blocking for staging cross-repo? |
|----|-------|----------------------------------|
| BCP-STAGING-001 | Partner roles in Auth/RLS | **YES** (4–10 partner) |
| BCP-STAGING-002 | partner_applications | YES |
| BCP-STAGING-003 | partner_profiles | YES |
| BCP-STAGING-004 | partner_codes | YES |
| BCP-STAGING-005 | Partner leads (separate from marketing leads) | YES |
| BCP-STAGING-006 | sales | YES |
| BCP-STAGING-007 | commissions + server calculation RPC | YES |
| BCP-STAGING-008 | payout_requests + approval RPC | YES |
| BCP-STAGING-009 | marketing_assets | NO |
| BCP-STAGING-010 | cash_receipts / ledger | YES for financial SST |
| BCP-STAGING-011 | reviews (optional) | NO |

Each must include: schema, RLS, RPCs, financial integrity, tests, acceptance, owner approval — using `docs/backend-change-proposal-template.md`.

---

## E. What can run on staging before partner migrations

| Scenarios | Status |
|-----------|--------|
| 1, 2, 3, 10 (customer half) | Runnable after staging create + fixtures |
| 7 | Runnable after staging Mollie test + optional checkout staging gate |
| 4, 5, 6, 8, 9 | **Blocked** on gaps above |

**Recommendation:** Do **not** create staging solely for partner E2E until BCP-STAGING-001–008 (and 010) are approved and migrated. Staging **may** be created earlier for customer-path validation (1–3, 10) if owner accepts a phased approach — record that decision explicitly.
