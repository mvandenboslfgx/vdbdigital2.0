# Legal, Fiscal and Provider Decisions — rc.5

**Status of every item on this page: OPEN.**

Nothing here has been decided, and nothing in the rc.5 backend encodes a decision
about any of it. This document exists to make the openness explicit so that a
green staging gate is not mistaken for legal readiness.

No answer below has been invented, inferred or assumed. Where the backend has a
placeholder, the placeholder is identified as such.

## Why this blocks public onboarding

The rc.5 activation checklist has slots for age verification, identity
verification, business verification, an accepted partner agreement and an
approved payout profile. On staging, four of those five slots were filled by
`staff_set_partner_compliance_fixture` — a synthetic, flag-gated staging tool
that writes statuses without performing any verification.

The mechanism is proven. The real-world process behind each slot does not exist
yet.

## Open items

### L1 — Partner agreement legal text
**OPEN.** `partner_agreement_versions` is seeded with two placeholder rows
(`INDIVIDUAL_PARTNER` and `BUSINESS_PARTNER`, both `v0.0.0-draft`) whose bodies
literally read `LEGAL_REVIEW_REQUIRED - placeholder only; not a binding legal
text.` and whose `legal_review_status` is `REQUIRED`.

The verifier check `seed:agreements_legal_review_required` enforces that no
`is_current` agreement may claim anything other than `REQUIRED`. Staff must not
present a `REQUIRED` body to a partner as a final agreement.

Consequence: acceptances recorded today are records of accepting a draft. They
are not evidence of a binding contract.

### L2 — Age verification (18+) provider and method
**OPEN.** No provider selected. `age_verification_source` is a free-text
provenance label and currently only ever holds `staging_fixture`.
`age_verification_expires_at` exists so a re-verification cadence can be
enforced, but no cadence has been set.

### L3 — Identity verification (KYC) provider
**DE-SCOPED FOR V1 (external provider).** No Veriff/Sumsub/Onfido or other external
IDV provider will be used for Partners v1. Camera IDV, document upload, selfie and
liveness are out of scope. UI/docs must describe **administrative partner review** only.

`identity_verification_status` / `identity_verification_provider_ref` columns **remain**
(fail-closed checklist + future optional IDV). Whether the gate is re-interpreted as
manual attestation, replaced by staff approval, or left blocking is **OPEN** — see
`DECISION_B_IDENTITY_GATE.md`. No automatic ID-check is live.

### L4 — Business verification / KvK source of truth
**OPEN.** `partner_is_valid_kvk` is format-only (exactly 8 digits). Nothing
checks a KvK number against the register. Whether to integrate a KvK API, accept
a staff-reviewed document, or use a third party is undecided.

### L5 — Payout profile review criteria
**OPEN.** `payout_profile_status` gates both activation and `payout_eligible`,
but no criteria exist for moving it to `APPROVED`. Bank account verification,
sanctions screening and beneficial-ownership checks are all undecided. No RPC
exists to set this status outside the staging fixtures.

### F1 — Partner fiscal classification and VAT treatment
**OPEN.** Commission to an `INDIVIDUAL` partner and to a `BUSINESS` partner
almost certainly differ in VAT and reporting treatment. rc.5 stores `vat_number`
on the application but derives nothing from it.

### F2 — Individual partner income reporting
**OPEN.** Whether commission paid to a particulier requires reporting, and under
which regime, is undecided. This is the single most likely reason a public
individual-partner programme cannot launch on the current foundation.

### F3 — Invoicing direction and self-billing
**OPEN.** Whether the partner invoices VDB or VDB self-bills the partner is
undecided, as is who owns the document.

### F4 — Withholding and thresholds
**OPEN.** No withholding logic exists. No earnings threshold triggers additional
checks.

### P1 — Payment rail for payouts
**OPEN.** `partner_payouts` is `false` on staging and production, so no payout
can be requested, approved or paid. rc.5 adds no payout mutation and relaxes
none; the rc.4 verifier check `no_payout_mutation_added` still passes.

### P2 — Data retention for verification artefacts
**OPEN.** rc.5 stores statuses, timestamps and opaque references only, which is
the correct default, but no retention or deletion schedule is defined for
whatever a provider holds on our behalf.

### P3 — DPA and sub-processor register
**OPEN.** No provider chosen, therefore no DPA signed and no sub-processor entry
made.

### P4 — Right to erasure across the acceptance ledger
**OPEN.** `partner_agreement_acceptances` is designed as an immutable record
(unique per partner and version, written only by
`accept_partner_agreement`). Immutability and an erasure request are in tension
and the resolution is undecided.

## What rc.5 does correctly given the openness

- Every gate fails closed. Missing verification blocks activation rather than
  waving it through.
- The fixtures that fill those gates are flag-gated
  (`partner_compliance_fixtures`), raise `FEATURE_DISABLED` when off, and are
  staging-only. Production has no such flag row.
- Verification statuses are truthful: absent verification reads `NOT_STARTED`,
  never a defaulted pass.
- Only statuses, timestamps and opaque provider references are stored. No
  document data.
- Agreement bodies are self-labelling placeholders and the verifier refuses to
  let a current agreement pretend otherwise.
- `payout_eligible` is derived exclusively from `payout_profile_status =
  'APPROVED'`, so no activation path can quietly enable money movement.

## Bottom line

The rc.5 gate covers the technical foundation. It does not and cannot authorize
public partner onboarding. Every item above must be closed by the accountable
owner before a real person is asked to become a partner.
