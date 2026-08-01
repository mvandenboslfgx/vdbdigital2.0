# Owner RC5 Gate — Verdict

```
OWNER RC5 STAGING GATE PASS — MOBILE AND PARTNERS INTEGRATION AUTHORIZED — PRODUCTION NOT AUTHORIZED
```

- Date: 2026-07-29
- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Bundle SHA256: `304f83cdc7ff98a525854d6be1a17bb8b5723c1dbcb2c44a5f35451a1cbd9f54`
- schemaVersion: `2026.07.29.partner-identity-directory-rc5`
- Staging: `qzekuvmgfekzsowdecyk`, migration tip `20260729140400`
- Production: `nhsrdnjfsxfikfbdmdfj`, migration tip `20260728213625`, untouched
- Branch: `phase/shared-partner-backend` @ `8e4d5f76c8ec609ca1f7bdf2f5553a07b773e591` (nothing committed)

## Why PASS

Both conditions of the verdict rule are satisfied.

**1. Staging matrix green.**
53 / 53 checks pass, 0 fail
(`scripts/staging-partner-identity-directory-rc5-matrix.sql`,
results in `STAGING_MATRIX.md` and `STAGING_MATRIX.json`).

All four contract verifiers report zero failures on staging:

| Verifier | Pass | Fail |
| --- | --- | --- |
| `verify_partner_identity_directory_rc5_contracts` | 53 | 0 |
| `verify_admin_control_surface_contracts` | 40 | 0 |
| `verify_messaging_support_appointments_contracts` | 33 | 0 |
| `verify_partner_admin_contracts` | 30 | 0 |

The one pre-existing failure (`flag:partner_compliance_fixtures`, which asserted
the staging fixtures flag was literally `false`) was resolved by migration
`20260729140400`, which narrows that assertion to an existence check. The
fail-closed guarantee it used to imply is unchanged and is still proven
independently by `fixtures:flag_gated`: the fixture RPC raises `FEATURE_DISABLED`
unless the flag is on.

**2. Production untouched.**
Read-only MCP inspection confirms migration tip `20260728213625`, zero rc.5
migrations, zero rc.5 columns, zero rc.5 RPCs, `support_internal_notes_rpc` still
`false`, no `partner_compliance_fixtures` row, and 3 partners of which 2 ACTIVE —
all unchanged. Details in `PRODUCTION_SAFETY_CHECK.md`.

## What PASS covers

- Seven staff-only admin directory detail RPCs plus ticket-reply listing, all
  stamping the rc.5 schema version, all withholding cost, PII, meeting links and
  internal notes (verified with poisoned marker values).
- Three-way denial on `admin_get_product`: customer `FORBIDDEN`, partner
  `FORBIDDEN`, `anon` blocked at the grant.
- Internal support notes: staff-only write, staff read includes internal, org
  member read excludes internal, non-member `FORBIDDEN`, and `FEATURE_DISABLED`
  when the flag is off.
- Typed partner intake with `INDIVIDUAL`/`BUSINESS`, including hard rejection of
  an `INDIVIDUAL` supplying a KvK and of a `BUSINESS` with a malformed one.
- The activation gate: submitting does not activate, staff approval alone does not
  activate, premature activation raises `ACTIVATION_DENIED`, AAL1 raises
  `AAL2_REQUIRED`, and full INDIVIDUAL and BUSINESS activation succeeds only once
  every checklist item is satisfied. Idempotent replay works.
- Backward compatibility: 3 pre-existing ACTIVE grandfathered partners still
  ACTIVE, still `REVIEW_REQUIRED`, population restored to baseline after the run.
- `partner_payouts` remains `false`. No payout mutation added or relaxed.

## What PASS explicitly does NOT cover

**PASS means the technical foundation only.**

**Public partner onboarding is NOT authorized.** Every KYC, legal and fiscal
question remains open and is documented as such in
`LEGAL_FISCAL_PROVIDER_DECISIONS.md`:

- Partner agreement text is a self-labelling non-binding placeholder
  (`legal_review_status = 'REQUIRED'`).
- No age (18+) verification provider chosen.
- No identity verification (KYC) provider chosen.
- No KvK register verification; the KvK check is format-only.
- No payout profile review criteria.
- Partner fiscal classification, VAT treatment, individual income reporting,
  invoicing direction and withholding all undecided.
- No DPA or sub-processor register, because no provider is selected.

On staging, four of the five compliance gates were satisfied by
`staff_set_partner_compliance_fixture`, a flag-gated synthetic staging tool. The
*mechanism* is proven; the real-world verification process behind it does not
exist yet.

**Production deployment is NOT authorized.** Applying rc.5 to
`nhsrdnjfsxfikfbdmdfj` requires a separate owner decision.

## Authorized next steps

- Mobile: integrate the rc.5 detail RPCs against **staging only**
  (`MOBILE_RC5_INTEGRATION_HANDOFF.md`).
- Partners Portal: adopt the typed `submit_partner_application` signature and the
  activation checklist against **staging only**
  (`PARTNERS_PORTAL_PARTNER_TYPE_HANDOFF.md`). Do not expose agreement acceptance
  to real users while `legal_review_status = 'REQUIRED'`.

## Not authorized

- Production migration of rc.5.
- Enabling any flag on production.
- Public or consumer-facing partner onboarding.
- Any payout request, approval or payment flow.

## Evidence pack

| File | Contents |
| --- | --- |
| `BASELINE.md` | Environment, contract, migration and flag baseline |
| `STAGING_MATRIX.md` | Full 53-check staging matrix walkthrough |
| `STAGING_MATRIX.json` | Machine-readable matrix result |
| `DIRECTORY_DETAIL_RPC_MATRIX.md` | Detail RPC signatures, payloads, omissions |
| `SUPPORT_INTERNAL_NOTES_SECURITY.md` | Internal notes threat model and controls |
| `PARTNER_TYPE_DOMAIN_MODEL.md` | INDIVIDUAL/BUSINESS model and vocabulary mapping |
| `PARTNER_ACTIVATION_STATE_MACHINE.md` | States, transitions, checklist, invariants |
| `EXISTING_PARTNER_COMPATIBILITY.md` | Grandfathering strategy and legacy impact |
| `LEGAL_FISCAL_PROVIDER_DECISIONS.md` | All open legal/fiscal/provider items |
| `MOBILE_RC5_INTEGRATION_HANDOFF.md` | Mobile handoff |
| `PARTNERS_PORTAL_PARTNER_TYPE_HANDOFF.md` | Partners Portal handoff |
| `PRODUCTION_SAFETY_CHECK.md` | Production read-only evidence and constraints honoured |
| `VERDICT.md` | This document |
