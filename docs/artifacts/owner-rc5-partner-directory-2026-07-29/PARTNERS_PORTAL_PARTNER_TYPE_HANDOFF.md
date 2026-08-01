# Partners Portal — Partner Type Handoff

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- schemaVersion: `2026.07.29.partner-identity-directory-rc5`
- Authorized environment: **staging `qzekuvmgfekzsowdecyk` only**

No file in the Partners repository was created or modified by this gate.

## Breaking change: `submit_partner_application` signature

The untyped 6-argument form has been **dropped**. Calling it now fails with
"function does not exist". The verifier asserts both facts
(`fn:submit_partner_application_typed`,
`fn:submit_partner_application_legacy_dropped`).

New signature:

```
submit_partner_application(
  p_partner_type  text,           -- 'INDIVIDUAL' | 'BUSINESS', required
  p_legal_name    text,           -- required
  p_trade_name    text,
  p_contact_email text,           -- required
  p_kvk           text = NULL,
  p_vat           text = NULL,
  p_phone         text = NULL
) RETURNS uuid                    -- application id
```

`p_partner_type` is upper-cased and trimmed server-side; anything other than
`INDIVIDUAL` or `BUSINESS` raises `VALIDATION_FAILED`.

## Type selection is the user's, never inferred

The portal must ask the applicant which they are. The backend will not guess, and
specifically will not infer type from whether a KvK number was entered.

Mapping from product vocabulary:

| User-facing choice | Send |
| --- | --- |
| Particulier | `INDIVIDUAL` |
| ZZP / eenmanszaak (sole trader) | `BUSINESS` |
| Bedrijf (BV, VOF, ...) | `BUSINESS` |

A sole trader is `BUSINESS`. See `PARTNER_TYPE_DOMAIN_MODEL.md`.

## Type-dependent form validation

Mirror these client-side, but expect the server to enforce them regardless.

**INDIVIDUAL**
- `p_kvk` must be omitted or empty. Sending any KvK value raises
  `VALIDATION_FAILED` — this is a hard rejection, not a warning, because
  accepting it would silently convert a particulier into a business identity.
- Do not render a KvK field at all once INDIVIDUAL is selected.

**BUSINESS**
- A company name is required (`p_trade_name` or `p_legal_name`).
- `p_kvk` must be exactly 8 digits after trimming. Anything else raises
  `VALIDATION_FAILED`.
- Format only: the backend does not check the KvK against the register.

## What submitting does and does not do

Submitting creates or updates an application (`SUBMITTED`) and creates or updates
the partner profile as **`PENDING`**, with `partner_type` set,
`type_classification_status = 'KNOWN'` and the required agreement family
resolved.

Submitting never activates a partner. Staff approval alone never activates a
partner either. Do not build UI that implies "submitted, you're live".

Resubmission is idempotent per user: an existing `DRAFT` / `SUBMITTED` /
`IN_REVIEW` application is updated in place and its `version` incremented, rather
than creating a duplicate.

## Agreement acceptance

```
accept_partner_agreement(p_agreement_version_id uuid) RETURNS uuid
```

Read the catalogue from `partner_agreement_versions` (SELECT is granted to
`authenticated`) and offer the row where `is_current = true` and
`agreement_type` matches the profile's `required_agreement_type`.

Rules:
- Only an `is_current` version can be accepted; a superseded draft raises
  `VALIDATION_FAILED`.
- Idempotent per `(partner, version)`.
- The caller must own a partner profile in `PENDING`, `ACTIVE` or `SUSPENDED`,
  else `FORBIDDEN`.

**Critical:** every current agreement today has
`legal_review_status = 'REQUIRED'` and a body that reads
`LEGAL_REVIEW_REQUIRED - placeholder only; not a binding legal text.` Do not
present it as a final contract. Do not launch an onboarding flow that asks a real
person to accept it. Gate the whole screen on
`legal_review_status = 'REQUIRED'` and treat that as "not ready".

## Activation status for the partner's own view

`partner_activation_checklist(p_partner_id uuid)` is callable by the partner for
their own profile (staff may call it for anyone; anyone else gets `FORBIDDEN`).

Returns `can_activate`, `missing[]` and a `checks` map. Use it to render a
progress checklist. Codes needing copy:

| Code | Partner-facing meaning |
| --- | --- |
| `PARTNER_TYPE_UNKNOWN` | Type not yet classified (legacy account) |
| `PARTNER_SUSPENDED` | Account suspended |
| `STAFF_APPROVAL_MISSING` | Awaiting VDB review |
| `AGE_NOT_VERIFIED` | 18+ verification outstanding |
| `IDENTITY_NOT_VERIFIED` | Identity verification outstanding |
| `BUSINESS_NOT_VERIFIED` | Company verification outstanding (BUSINESS only) |
| `COMPANY_DETAILS_MISSING` | Company name or KvK missing (BUSINESS only) |
| `AGREEMENT_NOT_ACCEPTED` | Current partner agreement not accepted |
| `PAYOUT_PROFILE_NOT_APPROVED` | Payout details not yet approved |

Several of these have no self-service path yet: age, identity, business
verification and payout approval can only be satisfied on staging by the
staff-only, flag-gated `staff_set_partner_compliance_fixture`. Present them as
"VDB will contact you", not as an action the partner can take.

## Legacy partners

An existing partner may have `partner_type = null`,
`type_classification_status = 'REVIEW_REQUIRED'` and
`legacy_activation_grandfathered = true`. They remain fully `ACTIVE` and
`payout_eligible`. Do not show them an onboarding funnel and do not imply their
account is incomplete. There is no API to classify them yet.

## Not available

- No payout request UI: `partner_payouts` is `false` everywhere.
- No production backend: rc.5 is not deployed to `nhsrdnjfsxfikfbdmdfj`.
- No public onboarding authorization: KYC, legal and fiscal items are all open
  (`LEGAL_FISCAL_PROVIDER_DECISIONS.md`).

## Verified on staging

Typed intake both types, both rejection paths, agreement acceptance, checklist
transitions and full activation — 53/53 green. See `STAGING_MATRIX.md`.
