# Partner Type Domain Model — rc.5

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Enum: `public.partner_type` = `INDIVIDUAL` | `BUSINESS`
- Classification enum: `public.partner_type_classification_status` =
  `UNKNOWN` | `KNOWN` | `REVIEW_REQUIRED`

## The two canonical types

| Type | Dutch business meaning | Agreement family |
| --- | --- | --- |
| `INDIVIDUAL` | particulier — a natural person acting privately | `INDIVIDUAL_PARTNER` |
| `BUSINESS` | an entity registered with the KvK | `BUSINESS_PARTNER` |

There are exactly two types at the database level. Legal form nuance
(eenmanszaak vs BV vs VOF) is not modelled in rc.5.

## Vocabulary mapping

The product vocabulary is coarser than the legal reality. The agreed mapping:

| Product / intake term | Canonical `partner_type` |
| --- | --- |
| particulier | `INDIVIDUAL` |
| sole_trader (eenmanszaak / ZZP) | `BUSINESS` |
| company (BV, VOF, stichting, ...) | `BUSINESS` |

A sole trader maps to `BUSINESS`, not `INDIVIDUAL`. The distinction that matters
to the backend is *"is there a KvK registration behind this partner?"*, not
*"is this one human?"*. A ZZP'er has a KvK number and issues invoices, so they
follow the business path including business verification.

Anything not in this table is not mappable and must reach a human. The backend
never guesses.

## Classification status

`type_classification_status` records *how confident we are* about the type, kept
separate from the type itself:

| Status | Meaning | How it is reached |
| --- | --- | --- |
| `UNKNOWN` | Never classified | Column default only |
| `KNOWN` | Positively classified by typed intake | `submit_partner_application` with a valid type, or staff approval of a typed application |
| `REVIEW_REQUIRED` | Legacy row awaiting staff classification | Backfill in `20260729140000` for any row with `partner_type IS NULL` |

The activation checklist requires `partner_type IS NOT NULL` **and**
`type_classification_status = 'KNOWN'`. `REVIEW_REQUIRED` therefore blocks new
activations while leaving already-ACTIVE legacy partners alone.

## Type is never inferred

This is the load-bearing invariant of the whole model:

- `partner_type` is **never** derived from the presence of a KvK number.
- `partner_is_valid_kvk(text)` is format-only: true if and only if the trimmed
  value is exactly 8 digits. It answers "is this well-formed?", never "is this
  real?" and never "what type is this partner?".
- Intake validation runs in the opposite direction: an `INDIVIDUAL` supplying a
  KvK is rejected with `VALIDATION_FAILED`, because silently accepting it would
  turn a particulier into a business identity. Verified on staging
  (`intake:individual_with_kvk_rejected`).
- A `BUSINESS` must supply a company name and an 8-digit KvK, else
  `VALIDATION_FAILED`. Verified (`intake:business_bad_kvk_rejected`).

## Type-dependent requirements

| Requirement | `INDIVIDUAL` | `BUSINESS` |
| --- | --- | --- |
| Age 18+ verified | required | required |
| Identity verified | required | required |
| Company legal name | not requested | required |
| Valid 8-digit KvK | must **not** be supplied | required |
| Business verification | not applicable, forced to satisfied | required (`VERIFIED`) |
| Agreement family | `INDIVIDUAL_PARTNER` | `BUSINESS_PARTNER` |
| Payout profile `APPROVED` | required | required |

`business_verification_status` stays `NOT_STARTED` for individuals and the
checklist treats the business gate as satisfied for them, rather than pretending
verification happened.

## Where the type lives

| Table | Column | Note |
| --- | --- | --- |
| `partner_applications` | `partner_type` | NULL means the applicant predates typed intake |
| `partner_profiles` | `partner_type` | Canonical value; NULL until typed intake or staff classification |
| `partner_profiles` | `required_agreement_type` / `required_agreement_version` | Derived from the type at intake time |

The checklist resolves the effective type as
`COALESCE(profile.partner_type, latest_application.partner_type)`, so a typed
application can carry a profile that has not been updated yet — but the
`KNOWN` classification requirement still has to be met on the profile.

## Staging verification

| Check | Result |
| --- | --- |
| INDIVIDUAL intake sets `INDIVIDUAL` / `KNOWN` / `INDIVIDUAL_PARTNER` | PASS |
| INDIVIDUAL intake stores no KvK | PASS |
| INDIVIDUAL + KvK rejected | PASS |
| BUSINESS intake sets `BUSINESS` / `BUSINESS_PARTNER` | PASS |
| BUSINESS with malformed KvK rejected | PASS |
| BUSINESS blocked until `business_verification_status = VERIFIED` | PASS (`BUSINESS_NOT_VERIFIED`) |
| Legacy rows remain `REVIEW_REQUIRED` | PASS |

## Open items

- No staff RPC exists yet to classify a `REVIEW_REQUIRED` legacy partner. Today
  it requires a direct operator update. A `staff_classify_partner_type` RPC is
  the obvious rc.6 candidate.
- Legal form beyond the INDIVIDUAL/BUSINESS split is unmodelled, which is
  relevant to the fiscal questions tracked in
  `LEGAL_FISCAL_PROVIDER_DECISIONS.md`.
