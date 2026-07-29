# Backend Contract — VDB Digital Platform

**Current shared local+staging target:** `vdb-backend-contract@0.2.0-rc.5` / `schemaVersion` `2026.07.29.partner-identity-directory-rc5`
**Bundle:** `contracts/releases/vdb-backend-contract-0.2.0-rc.5/`
**Previous shared target:** `vdb-backend-contract@0.2.0-rc.4` / `schemaVersion` `2026.07.29.admin-control-surface-rc4` (bundle `contracts/releases/vdb-backend-contract-0.2.0-rc.4/`)
**Superseded shared target:** `vdb-backend-contract@0.2.0-rc.3` / `schemaVersion` `2026.07.25.messaging-support-appointments-rc3`
**Local status:** `OWNER ADMIN RPC LOCAL PASS — STAGING APPLY IN GATE`
**Staging operator readiness:** `docs/evidence/admin-rpc-staging-gate-2026-07-29/`
**Surface audit:** `docs/owner-contract-surface-audit.md`
**Messaging map:** `docs/messaging-support-appointments-map.md`
**Convergence notes:** `docs/contract-convergence-rc2.md`
**Git freeze baseline:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`
**Partner work branch:** `phase/shared-partner-backend` (additive; not in exact-17 production apply)

**Publisher:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)
**Historical freeze (not staging target):** `vdb-backend-contract@0.1.0` / `schemaVersion` `2026.07.22.freeze`
**Partner RC1 (embedded, non-breaking):** `vdb-backend-contract@0.2.0-rc.1` / `schemaVersion` `2026.07.22.partner-rc1`
**Previous shared local target:** `vdb-backend-contract@0.2.0-rc.2` / `schemaVersion` `2026.07.24.mobile-compat-rc2`

This document defines the **versioned surface** clients must pin. A full generated `Database` types package is **planned**; until published as an artifact, clients treat this repo’s migrations + this file as the contract source. Checksums for partner RC: `docs/artifacts/partner-backend-contract-checksums.json`.

**Mobile local proposal `0.1.1` is not canonical and must not be published to staging.**

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
- Partner roles: `partner_profiles.status` — `PENDING` ≈ partner_pending, `ACTIVE` ≈ partner (not in `admin_roles`)

Clients must not invent parallel role systems.

---

## Domain groups in contract

### A. Customer / project / commerce (website + mobile)

| Area | Canonical objects (current or planned names) |
|------|-----------------------------------------------|
| Identity | `auth.users`, profiles / membership |
| Orgs | `organizations`, `organization_members`, invitations |
| Projects | `portal_projects`, members, milestones, deliverables, actions, activity, feedback |
| Messaging | `portal_conversations`, `portal_conversation_participants`, `portal_messages`, `portal_message_attachments` |
| Support | `portal_support_tickets`, `portal_support_replies` (Mobile: `support_messages` → replies) |
| Appointments | `portal_appointments`, `portal_appointment_participants` |
| Documents | `portal_files`, download events, private Storage buckets |
| Quotes | `portal_quotes`, items, versions, acceptances + RPCs |
| Invoices | `portal_invoices`, items, versions, payment records + RPCs |
| Web checkout orders/payments | existing order/payment tables + Mollie webhook (web) |

### B. Partner / affiliate (portal + mobile) — RC on branch

| Area | Canonical objects |
|------|-------------------|
| Onboarding | `partner_applications`, `partner_profiles` |
| Attribution | `partner_codes` |
| Pipeline | `partner_leads`, `partner_sales` (**not** marketing `leads`) |
| Money | `partner_commissions`, `partner_payout_requests`, `partner_payouts`, `partner_ledger_*`, `partner_cash_receipts`, `partner_adjustments` |
| Assets | DEFERRED — no marketing_assets bucket in this RC |
| Reviews | DEFERRED — fail-closed |

See `docs/shared-partner-rpc-contract.md` for RPC names and error codes.

---

## RPC / function surface (representative)

Clients call only documented, granted RPCs. Examples already in canonical migrations:

- Payment integrity / rate-limit helpers (service-role oriented)
- `accept_portal_quote` / `decline_portal_quote`
- Messaging/support/appointments RPCs (`create_portal_conversation`, `send_portal_message`, `reply_portal_support_ticket`, `book_portal_appointment`, …) — see `docs/messaging-support-appointments-map.md`
- `issue_portal_invoice` / `record_portal_invoice_payment` / `reverse_portal_invoice_payment`
- `verify_partner_admin_contracts` + partner mutation RPCs (see shared-partner-rpc-contract)
- Contract verifiers (`verify_*_contracts`, `verify_messaging_support_appointments_contracts`, `catalog_verify_admin_contracts`, `p05_verify_payment_contracts`)

**Contract rule:** privilege checks belong in RPC + RLS, not only in one client’s UI. Known hardening items from forensic audit (staff scope / invoice grants) must be fixed in **this** repo before partner/mobile rely on them in staging.

---

## rc.5 — partner identity + admin directory detail

Full detail: `contracts/releases/vdb-backend-contract-0.2.0-rc.5/RELEASE_NOTES.md`.

**Breaking:** `submit_partner_application` now takes `p_partner_type` (`'INDIVIDUAL'` | `'BUSINESS'`) as its **first** argument; the untyped 6-argument overload is dropped. `INDIVIDUAL` must not supply a KvK, `BUSINESS` requires a company name and an 8-digit KvK, and partner type is never inferred from a KvK number.

**Safe activation:** a partner reaches `ACTIVE` only through `partner_try_activate` when `partner_activation_checklist.can_activate` is true (type known, staff approval, 18+ and identity verified, type-bound business verification, current agreement accepted, `payout_profile_status = APPROVED`, not suspended). Staff approval alone no longer activates. Failures raise `ACTIVATION_DENIED:<code>`. `payout_eligible` follows `payout_profile_status = APPROVED` only. Partners already `ACTIVE` before rc.5 are marked `legacy_activation_grandfathered` and keep rc.4 behaviour.

**Additive staff reads:** `admin_get_product` / `admin_get_partner` / `admin_get_customer` / `admin_get_project` / `admin_get_quote` / `admin_get_invoice` / `admin_get_appointment`, plus `list_portal_support_ticket_replies` (staff see internal notes, org members do not).

**Flags:** `partner_compliance_fixtures` is new, fail-closed and **staging only**. `support_internal_notes_rpc` stays fail-closed by default; staging may enable it after the ACL matrix is proven.

**Legal review required:** seeded partner agreement bodies are placeholders with `legal_review_status = REQUIRED` and are not binding legal texts.

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
# Freeze baseline (pre-partner)
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.1.0
VDB_SCHEMA_VERSION=2026.07.22.freeze

# Partner RC (phase/shared-partner-backend — not production-authorized)
# VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.1
# VDB_SCHEMA_VERSION=2026.07.22.partner-rc1
```

Staging builds must pin the staging-published contract, not an arbitrary local experiment.
