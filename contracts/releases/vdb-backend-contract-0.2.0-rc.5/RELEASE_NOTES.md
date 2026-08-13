# vdb-backend-contract@0.2.0-rc.5

## schemaVersion

`2026.07.29.partner-identity-directory-rc5`

## Summary

Partner identity + admin directory detail on top of rc.4. Three themes: staff can open a
detail record for every directory row, partner type is now explicit, and a partner only
becomes `ACTIVE` once a full compliance checklist passes.

### New RPCs

- Directory detail: `admin_get_product`, `admin_get_partner`, `admin_get_customer`,
  `admin_get_project`, `admin_get_quote`, `admin_get_invoice`, `admin_get_appointment`
- Support: `list_portal_support_ticket_replies`
- Partner identity: `activate_partner_profile`, `accept_partner_agreement`,
  `partner_activation_checklist`, `partner_try_activate`, `partner_is_valid_kvk`
- Staging only: `staff_set_partner_compliance_fixture`
- `verify_partner_identity_directory_rc5_contracts`

### Breaking change — typed partner intake

`submit_partner_application` takes `p_partner_type` as its **first** argument and the
untyped 6-argument overload is dropped.

```text
submit_partner_application(
  p_partner_type text,   -- 'INDIVIDUAL' | 'BUSINESS'
  p_legal_name   text,
  p_trade_name   text,
  p_contact_email text,
  p_kvk   text DEFAULT NULL,
  p_vat   text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
```

- `INDIVIDUAL` (particulier) must **not** supply a KvK number.
- `BUSINESS` requires a company name and an 8-digit KvK number.
- Partner type is never inferred from the presence of a KvK number.
- Anything else raises `VALIDATION_FAILED`.

### Safe activation

`ACTIVE` is now written in exactly one place: `partner_try_activate`, and only when
`partner_activation_checklist.can_activate` is true. The checklist requires:

1. `partner_type` set and `type_classification_status = KNOWN`
2. Staff approval recorded (`staff_approved_at`, or an APPROVED application)
3. Age verification `VERIFIED` and not expired (18+ gate)
4. Identity verification `VERIFIED`
5. For `BUSINESS` only: business verification `VERIFIED` plus legal name and valid KvK
6. Acceptance of the **current** agreement version for the required family
7. `payout_profile_status = APPROVED`
8. Partner not `SUSPENDED` / `REVOKED`

Consequences:

- Staff approval alone no longer activates a partner. `review_partner_application`
  commits the approval, attempts activation, and on failure leaves the partner `PENDING`
  with `activation_block_codes` explaining why.
- `payout_eligible` is set only while `payout_profile_status = APPROVED`.
- `reactivate_partner` enforces the checklist for every partner that is not
  `legacy_activation_grandfathered`.
- Partners that were `ACTIVE` before rc.5 are marked grandfathered and keep rc.4 behaviour.
- Failures raise `ACTIVATION_DENIED:<first missing code>`.

### New tables

- `partner_agreement_versions` — agreement catalogue, at most one current version per family
- `partner_agreement_acceptances` — immutable acceptance record, written only by
  `accept_partner_agreement`

> **Legal review required.** Seeded agreement bodies are placeholders with
> `legal_review_status = REQUIRED`. They are not binding legal texts and must not be
> presented to a partner as final terms.

### New enums

`partner_type`, `partner_type_classification_status`, `partner_verification_status`,
`partner_payout_profile_status`, `partner_agreement_type`

### Feature flags

- `partner_compliance_fixtures` — new, fail-closed, **staging only**. Gates
  `staff_set_partner_compliance_fixture`. Must never be enabled in production.
- `support_internal_notes_rpc` — still fail-closed by default; staging may enable it after
  the ACL matrix is proven. Reading is not flag-gated:
  `list_portal_support_ticket_replies` always hides internal notes from non-staff callers.

### Privacy boundaries held by the detail RPCs

Never returned: `products.cost_cents` and supplier data, customer email / phone / VAT /
KvK / address, `portal_quotes.customer_note`, appointment `meeting_link` and attendee
identities, partner email addresses and balances.

### Verifier realignment

`verify_partner_admin_contracts` (rc.1) pinned the 6-argument submit signature and is
retargeted to the 7-argument typed form. No other check changed.

### Explicitly NOT activated for Mobile

- Payout approve / reject / process / paid mutations.

## Pin

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.5
VDB_SCHEMA_VERSION=2026.07.29.partner-identity-directory-rc5
```

## Staging

Authorized for staging apply after local verify. **Production not authorized.**
