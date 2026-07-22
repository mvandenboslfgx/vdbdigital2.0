# Staging Backend Gap Register — Canonical Schema vs Shared Platform Needs

**Date:** 2026-07-22  
**Canonical base HEAD:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`  
**Branch:** `phase/shared-partner-backend`  
**Local proof:** `supabase_db_vdbdigital2` — partner migrations 2026072210–2217 applied locally  
**Rule:** Status updates only; production apply still unauthorized

---

## Summary

| Classification | Count |
|----------------|------:|
| CANONICAL_PRESENT (usable for shared staging v1 customer path) | many |
| CANONICAL_DIFFERENT_NAME | 2 |
| IMPLEMENTED (partner domain on branch) | **9** (BCP-001–008, 010) |
| DEFERRED_NON_BLOCKING | **2** (BCP-009, 011) |
| OUT_OF_SCOPE_V1 | 1 |

**Partner/finance shared path is locally ready for staging clients after LOCAL PASS; staging project not created yet.**

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

- **Status:** IMPLEMENTED (`partner_profiles.status` PENDING/ACTIVE/SUSPENDED/REVOKED)
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
| `partner_applications` | IMPLEMENTED | BCP-STAGING-002 | 4 pre |
| `partner_profiles` | IMPLEMENTED | BCP-STAGING-003 | 4–6, 8–9 |
| `partner_codes` | IMPLEMENTED | BCP-STAGING-004 | 4, 8 |
| `partner_leads` (not marketing `leads`) | IMPLEMENTED | BCP-STAGING-005 | 4–5 |
| `partner_sales` | IMPLEMENTED | BCP-STAGING-006 | 6, 8 |
| `partner_commissions` | IMPLEMENTED | BCP-STAGING-007 | 8 |
| `partner_payout_requests` / `partner_payouts` | IMPLEMENTED | BCP-STAGING-008 | 9 |
| `marketing_assets` | DEFERRED_NON_BLOCKING | BCP-STAGING-009 | none for 1–10 core |
| `partner_cash_receipts` + ledger | IMPLEMENTED | BCP-STAGING-010 | financial integrity |
| Shared ledger entries | IMPLEMENTED | BCP-STAGING-010 | 8–9 |

### Important: existing `public.leads`

`leads` exists in `20260714000000_initial_schema.sql` as **marketing/contact lead capture** (website forms), **not** partner-attributed affiliate leads.  

**Classification:** CANONICAL_PRESENT (marketing) + **BACKEND_PROPOSAL_REQUIRED** for partner lead model (do not overload without explicit design) — BCP-STAGING-005.

---

## D. Proposal stubs (for backend-change-proposal-template)

| ID | Title | Status | Blocking for staging cross-repo? |
|----|-------|--------|----------------------------------|
| BCP-STAGING-001 | Partner roles in Auth/RLS | IMPLEMENTED | closed locally |
| BCP-STAGING-002 | partner_applications | IMPLEMENTED | closed locally |
| BCP-STAGING-003 | partner_profiles | IMPLEMENTED | closed locally |
| BCP-STAGING-004 | partner_codes | IMPLEMENTED | closed locally |
| BCP-STAGING-005 | Partner leads (separate from marketing leads) | IMPLEMENTED | closed locally |
| BCP-STAGING-006 | sales | IMPLEMENTED | closed locally |
| BCP-STAGING-007 | commissions + server calculation RPC | IMPLEMENTED | closed locally |
| BCP-STAGING-008 | payout_requests + approval RPC | IMPLEMENTED | closed locally |
| BCP-STAGING-009 | marketing_assets | DEFERRED_NON_BLOCKING | NO — fail-closed absence |
| BCP-STAGING-010 | cash_receipts / ledger | IMPLEMENTED | closed locally |
| BCP-STAGING-011 | reviews (optional) | DEFERRED_NON_BLOCKING | NO — fail-closed absence |

Each must include: schema, RLS, RPCs, financial integrity, tests, acceptance, owner approval — using `docs/backend-change-proposal-template.md`.

---

## E. What can run on staging before partner migrations

| Scenarios | Status |
|-----------|--------|
| 1, 2, 3, 10 (customer half) | Runnable after staging create + fixtures |
| 7 | Runnable after staging Mollie test + optional checkout staging gate |
| 4, 5, 6, 8, 9 | **Local contract PASS** on `phase/shared-partner-backend` — staging project still NOT CREATED |

**Decision (2026-07-22):** No customer-only staging. Create shared staging only after `CANONICAL PARTNER BACKEND LOCAL PASS`.  
BCP-009/011 deferred non-blocking with fail-closed clients; no temporary production record model.
