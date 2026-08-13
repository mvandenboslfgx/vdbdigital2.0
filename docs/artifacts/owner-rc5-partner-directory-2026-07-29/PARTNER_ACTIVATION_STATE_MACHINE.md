# Partner Activation State Machine — rc.5

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Source: `supabase/migrations/20260729140100_partner_identity_directory_rc5_activation.sql`
- Single source of truth for "may this partner become ACTIVE?":
  `partner_activation_checklist(uuid)`

## States

`partner_profiles.status`: `PENDING` -> `ACTIVE` -> `SUSPENDED` -> `ACTIVE`,
plus terminal `REVOKED`.

## Transitions and who owns them

| From | To | RPC | Authorization |
| --- | --- | --- | --- |
| (none) | `PENDING` | `submit_partner_application` | The applicant themselves |
| `PENDING` | `PENDING` | `review_partner_application(approve=true)` | staff |
| `PENDING` | `ACTIVE` | `partner_try_activate` (called by review or by `activate_partner_profile`) | staff; checklist must be green |
| `PENDING` | `ACTIVE` | `activate_partner_profile` | OWNER/ADMIN + AAL2 + reason + idempotency key |
| `ACTIVE` | `SUSPENDED` | `suspend_partner` (rc.4) | OWNER/ADMIN + AAL2 |
| `SUSPENDED` | `ACTIVE` | `reactivate_partner` | OWNER/ADMIN + AAL2; checklist enforced unless grandfathered |

`partner_try_activate` is the **only** writer of an `ACTIVE` partner profile.
Everything else delegates to it.

## The activation checklist

Nine conditions. `can_activate` is true only when `missing` is empty.

| Condition | Blocking code | Rule |
| --- | --- | --- |
| Type positively classified | `PARTNER_TYPE_UNKNOWN` | `partner_type IS NOT NULL AND type_classification_status = 'KNOWN'` |
| Not suspended or revoked | `PARTNER_SUSPENDED` | `status NOT IN ('SUSPENDED','REVOKED')` |
| Staff approval recorded | `STAFF_APPROVAL_MISSING` | `staff_approved_at` on the profile, or an `APPROVED` application with `staff_approved_at` |
| Age 18+ verified | `AGE_NOT_VERIFIED` | `age_verification_status = 'VERIFIED'` and not expired |
| Identity verified | `IDENTITY_NOT_VERIFIED` | `identity_verification_status = 'VERIFIED'` |
| Business verified (BUSINESS only) | `BUSINESS_NOT_VERIFIED` | `business_verification_status = 'VERIFIED'`; forced satisfied for INDIVIDUAL |
| Company details (BUSINESS only) | `COMPANY_DETAILS_MISSING` | legal name present and `partner_is_valid_kvk` true; forced satisfied for INDIVIDUAL |
| Current agreement accepted | `AGREEMENT_NOT_ACCEPTED` | An acceptance exists for the `is_current` version of the required family |
| Payout profile approved | `PAYOUT_PROFILE_NOT_APPROVED` | `payout_profile_status = 'APPROVED'` |

An expired age verification does not count: `age_verification_expires_at` must be
NULL or in the future.

## Invariants

1. **Submitting never activates.** `submit_partner_application` leaves the
   profile `PENDING`. Asserted structurally by the verifier check
   `activation:submit_never_activates`.
2. **Staff approval alone never activates.** `review_partner_application`
   records `staff_approved_at` and then *attempts* activation. A denied attempt
   does not roll back the approval; the failure is caught, the blocking codes are
   re-applied, and an `admin.partner.activation_deferred` audit row is written.
   Verified on staging: profile still `PENDING` after approval.
3. **Payout eligibility is never a side effect of activation.**
   `payout_eligible` is set to `(payout_profile_status = 'APPROVED')` and to
   nothing else. Asserted by `activation:payout_requires_approved_profile`.
4. **Fixtures never activate.** `staff_set_partner_compliance_fixture` writes
   verification statuses only; it never touches `status` or `payout_eligible`.
   Verified: after applying fixtures the profile was still `PENDING` with
   `payout_eligible = false`.
5. **An operator cannot activate their own partner profile.** Both
   `activate_partner_profile` and `reactivate_partner` raise `FORBIDDEN` when
   `partner.user_id = auth.uid()`.
6. **`compliance_status` only becomes `OK` through a successful activation.**

## `activation_block_codes` is diagnostic only

`partner_try_activate` writes the blocking codes and then raises, which aborts
that subtransaction — so callers that want the codes persisted must re-apply
them after catching `ACTIVATION_DENIED`, which is exactly what
`review_partner_application` does.

The column is a cache of the last denial for the admin UI. It is never read as an
authorization input. `admin_get_partner` returns both the cached codes and a
freshly computed checklist; consumers must trust the latter.

## Error contract

| Error | Meaning |
| --- | --- |
| `AUTH_REQUIRED` | No `auth.uid()` |
| `FORBIDDEN` | Not staff / not OWNER-ADMIN / self-activation attempt |
| `AAL2_REQUIRED` | Step-up MFA missing on a privileged activation |
| `VALIDATION_FAILED` | Bad intake payload, or missing idempotency key |
| `NOT_FOUND` | Unknown partner or application |
| `INVALID_TRANSITION` | Already `ACTIVE`, or reactivating something not `SUSPENDED` |
| `ACTIVATION_DENIED:<first missing code>` | Checklist incomplete |
| `IDEMPOTENCY_CONFLICT` | Key reused for a different partner |

## Reactivation and grandfathering

`reactivate_partner` splits on `legacy_activation_grandfathered`:

- **Grandfathered (pre-rc.5)**: restores the rc.4 behaviour, `payout_eligible`
  set to true, no checklist applied. Retro-applying a checklist that did not
  exist when they were activated would fabricate verification state.
- **Not grandfathered**: the full checklist runs and a failure raises
  `ACTIVATION_DENIED`.

Asserted by `activation:reactivate_uses_checklist`.

## Staging walkthrough (observed)

INDIVIDUAL, no KvK:

1. `submit_partner_application('INDIVIDUAL', ...)` -> `PENDING`, `KNOWN`
2. `review_partner_application(approve=true)` -> still `PENDING`,
   blocks `AGE_NOT_VERIFIED, IDENTITY_NOT_VERIFIED, AGREEMENT_NOT_ACCEPTED, PAYOUT_PROFILE_NOT_APPROVED`
3. `activate_partner_profile` -> `ACTIVATION_DENIED:AGE_NOT_VERIFIED`
4. `staff_set_partner_compliance_fixture(VERIFIED, VERIFIED, -, APPROVED)` ->
   still `PENDING`, `payout_eligible` still false
5. `accept_partner_agreement(current INDIVIDUAL_PARTNER)` -> ledger row
6. checklist -> `can_activate = true`, `missing = []`
7. `activate_partner_profile` (ADMIN, AAL2) -> `active`,
   `payout_eligible = true`, `compliance_status = OK`, audit id returned
8. Same call at AAL1 -> `AAL2_REQUIRED`

BUSINESS: identical, except the checklist additionally reported
`BUSINESS_NOT_VERIFIED` until `business_verification_status` was set to
`VERIFIED`, and activation was performed by OWNER at AAL2. Replaying the same
idempotency key returned the cached response.

## Audit trail

| Action | Written by |
| --- | --- |
| `portal.partner.application.submit` | `submit_partner_application` |
| `admin.partner.application.approved` / `.rejected` | `review_partner_application` |
| `admin.partner.activation_deferred` | `review_partner_application` on a denied attempt |
| `admin.partner.activated` | `partner_try_activate` |
| `admin.partner.activation_authorized` | `activate_partner_profile` (carries reason and idempotency key) |
| `admin.partner.reactivated` | `reactivate_partner` |
| `admin.partner.compliance_fixture` | `staff_set_partner_compliance_fixture` |
| `portal.partner.agreement.accepted` | `accept_partner_agreement` |

Audit metadata carries types, booleans and ids only, never applicant PII.
