# Mobile Admin RPC Integration Handoff

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**From:** VDB Digital 2.0 Owner (`CANONICAL_BACKEND_OWNER`)
**To:** Mobile (`vdb-app`)
**Date:** 2026-07-29
**Verdict companion:** see end of this gate report

---

## Owner identity

| Item | Value |
| --- | --- |
| Owner repo | `C:\Users\XXX\vdbdigital2.0` |
| Owner branch | `phase/shared-partner-backend` |
| Owner HEAD (git tip at handoff) | `a593e5d395fc7b90994c5cb2e8554cd241c48706` |
| Note | RC4 migrations + ACL hardening + contract bundle are in the Owner working tree and **applied to staging**; commit may still be pending on this dirty phase branch. |
| Contract | `vdb-backend-contract@0.2.0-rc.4` |
| schemaVersion | `2026.07.29.admin-control-surface-rc4` |
| Migrations | `20260729120000_admin_control_surface_rc4.sql`, `20260729120100_admin_control_surface_rc4_rpcs.sql`, `20260729130000_harden_admin_idempotency_helper_execute.sql` |
| Migration tip (local + staging) | `20260729130000` |
| Staging project-ref | `qzekuvmgfekzsowdecyk` |
| Production | **NOT touched** (denylist `nhsrdnjfsxfikfbdmdfj`) |

Bundle path (Owner): `contracts/releases/vdb-backend-contract-0.2.0-rc.4/`

---

## Contract drift (resolved)

| Canonical | Deprecated alias |
| --- | --- |
| `transition_portal_support_ticket_status` | `transition_portal_support_ticket` (thin wrapper; remove after Mobile pin) |

Mobile must update `contracts/backend-contract.json` required/mapping from the short name to `_status`.

Evidence: `docs/evidence/admin-rpc-staging-gate-2026-07-29/CONTRACT_DRIFT_RESOLUTION.md`

---

## RPC catalogue for Mobile

### P0 — replace hard throws

#### `admin_dashboard_stats()`

- **Auth:** JWT authenticated + `is_staff_admin()` (staff/admin/owner)
- **AAL:** AAL1 OK
- **Input:** none
- **Output (fixed jsonb):**
  - `open_partner_applications` (int)
  - `open_tickets` (int)
  - `commissions_under_review` (int)
  - `payout_requests` (int) — count only
  - `unread_messages` (int)
  - `documents_pending_review` (int)
  - `upcoming_appointments` (int)
  - `generated_at` (timestamptz)
  - `schema_version` (`2026.07.29.admin-control-surface-rc4`)
- **Rules:** missing → `0`; never omit keys; no PII; no money amounts
- **Mobile:** replace `CONTRACT_SURFACE_UNAVAILABLE:admin_dashboard_stats` in `getAdminStats()`

#### `admin_work_queue(p_limit int default 25, p_cursor timestamptz default null, p_types text[] default null)`

- **Auth:** staff+
- **AAL:** AAL1 OK
- **Limits:** clamped 1..100
- **Output:** `{ items: [...], next_cursor, schema_version }`
- **Item shape:** `id`, `type`, `title`, `subtitle`, `status`, `priority` (`low|normal|high|urgent`), `created_at`, `updated_at`, `route_key`, `requires_aal2`
- **Types:** `partner_application | support_ticket | commission_review | document_review | appointment`
- **Mobile:** replace `CONTRACT_SURFACE_UNAVAILABLE:admin_work_queue` in `listAdminQueue()`

### Commission review (day-1)

#### `approve_partner_commission(p_commission_id uuid, p_reason text, p_idempotency_key text)`
#### `reject_partner_commission(p_commission_id uuid, p_reason text, p_idempotency_key text)`

- **Capability:** OWNER / ADMIN only (`is_admin_or_owner`)
- **AAL2:** required (`AAL2_REQUIRED` if missing)
- **Reason:** trimmed, length 8..500 (`VALIDATION_FAILED`)
- **Idempotency:** required; replay returns same jsonb; cross-resource key → `IDEMPOTENCY_CONFLICT`
- **State:** `PENDING|ELIGIBLE` → `approved` / `rejected`
- **Output:** `{ id, previous_status, status, updated_at, audit_id }`
- **Side effects:** approve posts `COMMISSION_ACCRUAL` ledger; reject does not; **no payout mutation**
- **Conflict of interest:** actor cannot be the partner user
- **Financial note:** `confirm_partner_sale` now creates commissions as `PENDING` (no ledger until approve)
- **Mobile:** enable commission approve/reject UI; map Mobile names `approve_commission` / `reject_commission`

### Partner lifecycle

#### `suspend_partner(p_partner_id uuid, p_reason text, p_idempotency_key text)`
#### `reactivate_partner(p_partner_id uuid, p_reason text, p_idempotency_key text)`

- **Capability:** OWNER / ADMIN + AAL2
- **Transitions:** ACTIVE→SUSPENDED; SUSPENDED→ACTIVE
- **Output:** `{ id, previous_status, status, updated_at, audit_id }`
- **Downstream:** suspended partners cannot `create_partner_lead` (FORBIDDEN)
- **Mobile:** enable Partners Meer suspend/reactivate

### Directory (staff+, AAL1, paginated)

All return `{ items, next_cursor, schema_version }` with `p_limit` / `p_cursor` (+ optional `p_status`):

| RPC | Source SSOT |
| --- | --- |
| `admin_list_products` | `products` |
| `admin_list_partners` | `partner_profiles` |
| `admin_list_customers` | `organizations` (no email/phone/VAT) |
| `admin_list_projects` | `portal_projects` |
| `admin_list_quotes` | `portal_quotes` |
| `admin_list_invoices` | `portal_invoices` |
| `admin_list_appointments` | `portal_appointments` (no attendee emails / meeting links) |

**Mobile:** activate Meer directory placeholders that match these surfaces. No direct table SELECTs.

### Settings / security

#### `admin_get_settings_summary()`
Safe booleans + versions only. Env-owned secrets (`whatsapp_configured`, `mollie_enabled`, `checkout_enabled`) reported as **false** from DB (app may overlay). Includes `contract_version` / `schema_version`.

#### `admin_get_security_status()`
`current_aal`, `mfa_enrolled`, `mfa_required`, `step_up_required`, `actor_role`, `capabilities[]`. No secrets/tokens/recovery codes.

---

## Error codes Mobile must map

| Code | Meaning |
| --- | --- |
| `AUTH_REQUIRED` | No JWT / no uid |
| `FORBIDDEN` | Role / conflict-of-interest / staff on admin-only mutation |
| `AAL2_REQUIRED` | Step-up needed |
| `VALIDATION_FAILED` | Reason/idempotency/input |
| `NOT_FOUND` | Unknown id |
| `INVALID_TRANSITION` | Illegal state machine move |
| `IDEMPOTENCY_CONFLICT` | Key reused across different RPC/resource |
| `FEATURE_DISABLED` | Existing flag gates (unchanged) |

---

## Feature flags / payouts

| Surface | Policy |
| --- | --- |
| Payout approve / reject / process / paid | **DISABLED for Mobile** — do not wire CTAs |
| `partner_payouts` flag | remains fail-closed unless separately authorized |
| `admin_dashboard_stats.payout_requests` | read-only count OK |

---

## Support / internal notes

- Public replies: `reply_portal_support_ticket`
- Internal notes: `add_portal_support_internal_note` (staff + `support_internal_notes_rpc` flag)
- Do **not** expose internal notes to customers
- Staff list filters: Mobile must not use a customer-visible `is_internal=false` filter for staff ticket detail if staff notes are required; use capability-aware fetch / separate internal note path

---

## Which Mobile hard throws may be replaced

| Surface | Action |
| --- | --- |
| `admin_dashboard_stats` | **Activate** |
| `admin_work_queue` | **Activate** |
| commission approve/reject | **Activate** (AAL2 UX + Owner enforcement) |
| suspend/reactivate partner | **Activate** |
| directory Meer lists above | **Activate** via RPCs only |
| settings / security status | **Activate** read-only RPCs |
| ticket transition name | **Align** to `_status` |

## Still BLOCKED / placeholders

| Surface | Reason |
| --- | --- |
| Payout mutation UI | Owner policy — not authorized |
| `register_document_upload` / scan clean / create_project_from_request | still deferred |
| Production | not authorized |
| Play Store submit | out of scope |

---

## Staging evidence (synthetic / no real PII)

| Check | Result |
| --- | --- |
| Local `db reset` applying RC4 + ACL hardening | PASS |
| Local `verify_admin_control_surface_contracts` | **40/40** |
| Local security matrix `scripts/test-admin-control-surface-rc4.ts` | **37/37 PASS** |
| Staging ACL hardening push (`20260729130000`) | PASS — SHA-256 `E8FC2E0F…558B3E` |
| Staging tip | `20260729130000` |
| Staging verify RPC | **40 pass / 0 fail** |
| Staging negative + functional matrix | **27/27 PASS** |
| Helper ACL | PUBLIC/anon/authenticated/service_role **denied**; owner-only |
| Production writes | none |

Evidence:

- `IDEMPOTENCY_HELPER_ACL_HARDENING.md`
- `STAGING_NEGATIVE_MATRIX.md`
- `STAGING_FUNCTIONAL_RPC_TESTS.md`

---

## Mobile pin checklist

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.4
# schemaVersion=2026.07.29.admin-control-surface-rc4
```

1. Bump Mobile contract pin to rc.4 / schemaVersion above.
2. Fix ticket transition required name → `transition_portal_support_ticket_status`.
3. Allowlist new Owner RPCs in `RC3_OWNER_RPCS` / successor set.
4. Wire dashboard + work queue + commission + suspend + directory + settings/security.
5. Keep payout mutations disabled.
6. Staging matrix + S25 manual — **no APK / no store submit until Owner+Mobile review**.

---

## Explicit non-goals completed by Owner

- No Mobile repo edits
- No production SQL/migration
- No payout mutation activation
- No service-role to client
- No mock/legacy fallback paths
