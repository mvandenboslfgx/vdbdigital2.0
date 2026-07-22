# Backend Contract — VDB Digital Platform

**Publisher:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)  
**Contract version (freeze baseline):** `vdb-backend-contract@0.1.0`  
**schemaVersion:** `2026.07.22.freeze`  
**Git baseline:** `1544d445d1d05c700b59360bdd4015afb0727bb8` (`production-database-apply-ready`)

This document defines the **versioned surface** clients must pin. A full generated `Database` types package is **planned**; until published as an artifact, clients treat this repo’s migrations + this file as the contract source.

---

## Versioning rules

1. Every breaking schema/RPC/enum change bumps `schemaVersion` and contract semver.  
2. Mobile and Partner record the pinned `schemaVersion` in their repo (env or config).  
3. **Drift check (required target):** client CI fails if pinned `schemaVersion` ≠ intended staging/production contract tag.  
4. Additive non-breaking changes may be minor bumps; removals/renames are major.

---

## Roles (target shared identity)

```text
customer
partner_pending
partner
staff
admin
owner
```

**Current web implementation notes (honest):**

- Staff/admin: `admin_roles` + permission matrix (`src/lib/auth/permissions.ts`)
- Customers: `organization_members` + portal roles (`PRIMARY` | `MEMBER` | `BILLING` | `VIEW_ONLY`)
- Partner roles: **not yet** first-class tables in canonical migrations — future migrations land here

Clients must not invent parallel role systems.

---

## Domain groups in contract

### A. Customer / project / commerce (website + mobile)

| Area | Canonical objects (current or planned names) |
|------|-----------------------------------------------|
| Identity | `auth.users`, profiles / membership |
| Orgs | `organizations`, `organization_members`, invitations |
| Projects | `portal_projects`, members, milestones, deliverables, actions, activity, feedback |
| Messaging | conversations, participants, messages |
| Support | tickets, replies, notifications |
| Documents | `portal_files`, download events, private Storage buckets |
| Quotes | `portal_quotes`, items, versions, acceptances + RPCs |
| Invoices | `portal_invoices`, items, versions, payment records + RPCs |
| Web checkout orders/payments | existing order/payment tables + Mollie webhook (web) |

### B. Partner / affiliate (portal + mobile) — planned

| Area | Planned objects |
|------|-----------------|
| Onboarding | `partner_applications`, `partner_profiles` |
| Attribution | `partner_codes` |
| Pipeline | `leads`, `sales` |
| Money | `commissions`, `payout_requests` |
| Assets | `marketing_assets` |

Until migrations exist in this repo, Partner/Mobile may prototype **local-only** tables but must not treat them as production truth.

---

## RPC / function surface (representative)

Clients call only documented, granted RPCs. Examples already in canonical migrations:

- Payment integrity / rate-limit helpers (service-role oriented)
- `accept_portal_quote` / `decline_portal_quote`
- `issue_portal_invoice` / `record_portal_invoice_payment` / `reverse_portal_invoice_payment`
- Contract verifiers (`verify_*_contracts`, `catalog_verify_admin_contracts`, `p05_verify_payment_contracts`)

**Contract rule:** privilege checks belong in RPC + RLS, not only in one client’s UI. Known hardening items from forensic audit (staff scope / invoice grants) must be fixed in **this** repo before partner/mobile rely on them in staging.

---

## Storage buckets (canonical)

Private (`public=false`) after full migration apply:

- `customer-documents`
- `invoice-documents`
- `product-media`
- `project-files`
- `quote-documents`
- `support-attachments`

Signed URLs only after server-side authorization.

---

## Feature flags (platform-owned)

| Flag | Default | Notes |
|------|---------|-------|
| `CHECKOUT_ENABLED` | false / unset | Fail-closed |
| `P05_MIGRATION_APPLIED` | unset | Operator hint; not a substitute for schema |

Mobile/Partner must not enable web checkout flags.

---

## Error codes (initial set)

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | No session |
| `AUTH_NO_ACCESS` | Authenticated but no org/role home |
| `FORBIDDEN` | RLS or permission deny |
| `NOT_FOUND` | Missing or cross-tenant hidden |
| `CONFLICT` | Idempotency / state machine reject |
| `VALIDATION_FAILED` | Schema/Zod failure |
| `CHECKOUT_DISABLED` | Commerce fail-closed |
| `CONTRACT_DRIFT` | Client schemaVersion mismatch |

---

## Zod / TypeScript

- Web validation lives under `src/lib/validation/` and related modules.
- Target: export a shared package or `contracts/` snapshot generated from migrations for Mobile/Partner.
- Until then: Partner/Mobile copy only **published** contract files — no silent fork.

---

## How clients declare the pin

Example (any client):

```env
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.1.0
VDB_SCHEMA_VERSION=2026.07.22.freeze
```

Staging builds must pin the staging-published contract, not an arbitrary local experiment.
