# Shared Partner Backend — Design

**Branch:** `phase/shared-partner-backend`  
**Contract RC:** `vdb-backend-contract@0.2.0-rc.1`  
**schemaVersion:** `2026.07.22.partner-rc1`  
**Outside production baseline:** ends at `20260719170000`

## Object mapping

| REQUIRED_OBJECT | EXISTING_EQUIVALENT | REUSE_SAFE | EXTENSION_REQUIRED | NEW_OBJECT_REQUIRED | CONFLICT_RISK |
|-----------------|---------------------|------------|--------------------|---------------------|---------------|
| Partner identity / roles | `admin_roles`, `profiles` | Partial — staff via `admin_roles` | Document role mapping | `partner_profiles` status machine | Low — do not put partner in `admin_roles` |
| Partner application | none | — | — | `partner_applications` | Low |
| Partner codes | none | — | — | `partner_codes` | Low |
| Partner leads | `public.leads` (marketing) | **NO** | — | `partner_leads` | High if overloaded |
| Partner sales | `orders`/`payments` | Link only | Optional FKs | `partner_sales` | Medium — payment_id is TEXT |
| Commissions | none | — | — | `partner_commissions` | Low |
| Payouts | none | — | — | `partner_payout_requests`, `partner_payouts` | Low |
| Ledger / cash | portal invoice payments | **NO** as SST | — | `partner_ledger_*`, `partner_cash_receipts`, `partner_adjustments` | Low |
| Marketing assets | Storage buckets (6) | Existing buckets incompatible | — | Deferred (BCP-009) | High if 7th bucket |
| Reviews | none | — | — | Deferred (BCP-011) | — |

## Role model

| Shared role | Canonical encoding |
|-------------|-------------------|
| customer | `organization_members` |
| partner_pending | `partner_profiles.status = PENDING` |
| partner | `partner_profiles.status = ACTIVE` |
| staff / admin / owner | `admin_roles.role` (`SUPPORT`/`CONTENT`/`ADMIN`/`OWNER`) |

Transitions: application SUBMITTED → PENDING profile; staff approve → ACTIVE + code; reject → REJECTED application; suspend/revoke via profile status fields.

## Domain boundary

Marketing `public.leads` remains website contact capture. Partner attribution uses **`partner_leads` only**.

## Storage / reviews

- **BCP-STAGING-009:** DEFERRED_NON_BLOCKING — no 7th bucket; scenarios 1–10 unblocked.
- **BCP-STAGING-011:** DEFERRED_NON_BLOCKING — no half reviews system; clients fail-closed.
