# Admin Directory Detail RPC Matrix — rc.5

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- schemaVersion stamped by every RPC below: `2026.07.29.partner-identity-directory-rc5`
- Source: `supabase/migrations/20260729140200_admin_directory_detail_rc5_rpcs.sql`
- Verified on staging `qzekuvmgfekzsowdecyk` — see `STAGING_MATRIX.md`

Every RPC in this surface is `SECURITY DEFINER` with `SET search_path = public`,
is read-only, and selects an explicit column list (never `SELECT *`).

## Signatures and access

| RPC | Signature | Who may call | `anon` EXECUTE |
| --- | --- | --- | --- |
| `admin_get_product` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_partner` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_customer` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_project` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_quote` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_invoice` | `(uuid) -> jsonb` | staff only | revoked |
| `admin_get_appointment` | `(uuid) -> jsonb` | staff only | revoked |
| `list_portal_support_ticket_replies` | `(uuid, int, timestamptz) -> jsonb` | staff **or** active member of the ticket's organization | revoked |

"Staff" means `public.is_staff_admin()`: the caller has a row in `admin_roles`
and an active profile.

## Error contract

| Condition | Error |
| --- | --- |
| No `auth.uid()` | `AUTH_REQUIRED` |
| Caller is not staff (and, for ticket replies, not an org member) | `FORBIDDEN` |
| Resource id does not exist | `NOT_FOUND` |
| Caller is `anon` | `permission denied for function ...` (grant-level, body never runs) |

`EXECUTE` is granted to `authenticated` and `service_role` only. The grant is
deliberately broad because each function re-checks the role itself; the grant is
not the authorization boundary, the body is.

## Deliberate omissions (data minimisation)

These fields are never selected, so they cannot leak through a serialisation
mistake:

| Resource | Withheld |
| --- | --- |
| Product | `cost_cents`, margin, supplier data |
| Customer (organization) | `contact_email`, `contact_phone`, `kvk_number`, `vat_number`, `invoice_address` |
| Quote | `customer_note`, `decline_reason`, document paths |
| Appointment | `meeting_link`, attendee identities, internal `notes` |
| Partner | email address, financial balances |

Each omission was verified negatively on staging: the seed data contained
poisoned marker values (`42424` for `cost_cents`,
`SYNTHETIC_CUSTOMER_NOTE_MUST_NOT_LEAK`, `SYNTH_MEETING_LINK_MUST_NOT_LEAK`,
`SYNTHETIC_INTERNAL_NOTE_MUST_NOT_LEAK`) and none appeared in any payload.

## Per-RPC payload shape

### `admin_get_product`
Scalars: `id`, `slug`, `name`, `status`, `summary`, `price_cents`,
`from_price_cents`, `currency`, `price_mode`, `publication_ready`,
`legal_status`, `partner_enabled`, `partner_visibility`,
`partner_commission_status`, `partner_availability`, `featured`, timestamps.

`eligibility` object: `public_eligible`, `partner_eligible`,
`legal_review_status`, `price_status`, `visibility`, `commission_status`,
`inventory_status`. This mirrors the publish and partner gates for display; it
does not grant them.

### `admin_get_partner`
Identity and compliance projection of `partner_profiles`: `partner_type`,
`type_classification_status`, all four verification statuses with their
timestamps, `payout_profile_status`, `staff_approved_at`,
`legacy_activation_grandfathered`, `activation_block_codes`,
`required_agreement_type` / `_version`, plus a live
`activation_checklist` object produced by `partner_activation_checklist`.

`activation_block_codes` is a diagnostic cache of the last denial. It is never
an authorization source; the embedded live checklist is.

### `admin_get_customer`
Identity plus counters only: `project_count` and `open_ticket_count`
(open = `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_VDB`).

### `admin_get_project`
Project scalars, a resolved `customer_label`, and `quote_count`,
`invoice_count`, `appointment_count`.

### `admin_get_quote`
Header, a `totals` object (`subtotal_cents`, `vat_cents`, `discount_cents`,
`total_cents`), and up to 50 line items with `items_truncated` signalling
overflow.

### `admin_get_invoice`
Header plus a `totals` object that additionally carries `amount_paid_cents` and
`amount_due_cents`. Strictly read-only: no payment, reversal or provider field
is exposed or mutated.

### `admin_get_appointment`
Scheduling scalars. `notes_customer_safe` is hard-coded to `NULL` because
`portal_appointments.notes` has no customer-visibility marker, so it is treated
as internal until such a column exists. Reads are not gated by the
`appointments_booking` flag; that flag gates mutations only.

### `list_portal_support_ticket_replies`
Keyset pagination on `created_at DESC, id DESC`, limit clamped to 1..100.
Staff see every reply; org members see only `is_internal = false`. See
`SUPPORT_INTERNAL_NOTES_SECURITY.md`.

## Staging verification summary

All nine positive-path checks and all four data-minimisation checks passed, plus
`NOT_FOUND` behaviour and the three denial paths. Full detail in
`STAGING_MATRIX.md` and `STAGING_MATRIX.json`.
