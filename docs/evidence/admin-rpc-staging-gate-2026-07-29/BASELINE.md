# Owner Admin RPC Staging Gate — Read-only baseline

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Captured:** 2026-07-29
**Policy:** LOCAL + STAGING ONLY — no production writes

## Identity

| Item | Value |
| --- | --- |
| Repository path | `C:\Users\XXX\vdbdigital2.0` |
| Branch | `phase/shared-partner-backend` |
| HEAD | `a593e5d395fc7b90994c5cb2e8554cd241c48706` |
| Working tree | Dirty (~204 paths at gate start; RC3 + unrelated WIP present) |
| Active agents | Historical terminal artifacts only; no blocking live gate process |
| Contract (pre-gate) | `vdb-backend-contract@0.2.0-rc.3` |
| schemaVersion (pre-gate) | `2026.07.25.messaging-support-appointments-rc3` |
| rc.4 exists? | **No** (pre-gate) |

## Supabase CLI link

| Item | Value |
| --- | --- |
| Linked project-ref | `qzekuvmgfekzsowdecyk` |
| Staging project name | VDB Digital Staging |
| Staging project-ref | `qzekuvmgfekzsowdecyk` |
| Production denylist | `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) |
| CLI write target before any write | **Confirmed staging** `qzekuvmgfekzsowdecyk` |

## Migrations

| Environment | Count (approx) | Tip |
| --- | --- | --- |
| Local files (pre-gate tip) | 46 (+ 3 remote-only fetched) | `20260725120300` then reconciled to include `20260728210000` |
| Staging (linked) | tip | `20260728210000` |
| Production | **read-only only** | Not linked; denylist `nhsrdnjfsxfikfbdmdfj`; **no SQL / no migrate** |

Remote-only staging migrations reconciled into local tree (additive fetch; tracked files restored from HEAD after accidental overwrite):

- `20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql`
- `20260728090100_partner_financial_summary_active_only.sql`
- `20260728210000_partner_catalog_coupling.sql`

## Existing surfaces (pre-gate)

| Surface | Present? |
| --- | --- |
| `admin_dashboard_stats` | **Missing** (deferred in rc.3) |
| `admin_work_queue` | **Missing** (deferred in rc.3) |
| `transition_portal_support_ticket_status` | **Canonical in Owner migrations + rc.3 rpcs.json** |
| `transition_portal_support_ticket` | Mobile `backend-contract.json` alias only — **not** Owner SQL |
| `approve_partner_commission` / `reject_partner_commission` | Missing |
| `suspend_partner` / `reactivate_partner` | Missing (enum supports SUSPENDED) |
| Capability helper | `is_staff_admin()` (any `admin_roles` row) |
| Admin/owner-only helper | `can_reverse_invoice_payment()` pattern (`OWNER`,`ADMIN`) |
| AAL2 in SQL | **Absent** (TS-only `requireAal2`) — gate adds JWT AAL helpers |
| Audit | `audit_logs` + `portal_write_audit` |
| Idempotency | Per-table keys on partner/financial/message paths |

## Explicit non-actions

- No production SQL
- No production migration
- No Mobile repository edits
- No payout mutation activation for Mobile
