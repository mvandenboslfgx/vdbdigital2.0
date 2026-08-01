# Mobile RC5 Integration Handoff

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Bundle SHA256: `304f83cdc7ff98a525854d6be1a17bb8b5723c1dbcb2c44a5f35451a1cbd9f54`
- schemaVersion returned by every rc.5 surface: `2026.07.29.partner-identity-directory-rc5`
- Authorized environment: **staging `qzekuvmgfekzsowdecyk` only**
- Production `nhsrdnjfsxfikfbdmdfj`: rc.5 is **not** deployed. Do not point a
  build at it and expect these RPCs to exist.

No file in the Mobile repository was created or modified by this gate. This is a
read-only handoff describing what the staging backend now guarantees.

## Detail RPCs now available

All staff-only, all read-only, all returning `jsonb` with a `schema_version` key.

| RPC | Argument |
| --- | --- |
| `admin_get_product` | `p_product_id uuid` |
| `admin_get_partner` | `p_partner_id uuid` |
| `admin_get_customer` | `p_organization_id uuid` |
| `admin_get_project` | `p_project_id uuid` |
| `admin_get_quote` | `p_quote_id uuid` |
| `admin_get_invoice` | `p_invoice_id uuid` |
| `admin_get_appointment` | `p_appointment_id uuid` |
| `list_portal_support_ticket_replies` | `p_ticket_id uuid, p_limit int = 50, p_cursor timestamptz = NULL` |

Field-level shapes are in `DIRECTORY_DETAIL_RPC_MATRIX.md`.

## Error contract to implement

| Backend error | Meaning | Suggested client behaviour |
| --- | --- | --- |
| `AUTH_REQUIRED` | No session | Route to sign-in |
| `FORBIDDEN` | Signed in, not staff | Hide the surface entirely; do not retry |
| `NOT_FOUND` | Unknown id | Empty state |
| `FEATURE_DISABLED` | Flag off for this environment | Hide the feature, do not surface as an error |
| `AAL2_REQUIRED` | Step-up MFA needed | Trigger MFA challenge, then retry |
| `ACTIVATION_DENIED:<CODE>` | Checklist incomplete | Show the missing items, never retry blindly |
| `IDEMPOTENCY_CONFLICT` | Key reused for a different resource | Bug; log it |
| `VALIDATION_FAILED` | Bad input | Field-level validation message |
| `INVALID_TRANSITION` | Illegal state change | Refresh and re-render |

Errors arrive as Postgres exception messages. `ACTIVATION_DENIED` is the only one
with a payload suffix; split on the first `:`.

## Version pinning

Assert `schema_version == "2026.07.29.partner-identity-directory-rc5"` on every
response and fail loudly on mismatch. All ten rc.5 surfaces stamp it, and the
verifier check `schema_version:detail_rpcs` enforces that none of them can drift.

`admin_get_security_status` also reports this value and is the cheapest probe for
"which contract is this environment on?".

## Partner detail rendering

`admin_get_partner` returns two things that look similar and must not be confused:

- `activation_block_codes` — a **cached** array from the last denial. Diagnostic
  only.
- `activation_checklist` — a **live** object with `can_activate`, `missing[]` and
  a `checks` map.

Drive the UI from `activation_checklist`. Treat `activation_block_codes` as a
stale hint at best.

Blocking codes to have copy for: `PARTNER_TYPE_UNKNOWN`, `PARTNER_SUSPENDED`,
`STAFF_APPROVAL_MISSING`, `AGE_NOT_VERIFIED`, `IDENTITY_NOT_VERIFIED`,
`BUSINESS_NOT_VERIFIED`, `COMPANY_DETAILS_MISSING`, `AGREEMENT_NOT_ACCEPTED`,
`PAYOUT_PROFILE_NOT_APPROVED`.

## Partner type

`partner_type` is `INDIVIDUAL` or `BUSINESS`, or **`null`** for a legacy partner
that has never been classified. Handle the null case: those rows also carry
`type_classification_status = 'REVIEW_REQUIRED'` and
`legacy_activation_grandfathered = true`. Do not render null as `INDIVIDUAL`.

For a BUSINESS partner, show business verification. For an INDIVIDUAL, do not —
the backend forces that gate satisfied rather than verifying anything, so
displaying it would be misleading.

## Support ticket replies

`is_internal` is present on every reply item. Staff builds will receive internal
notes; customer builds will never receive them because the filter is server-side.
Do not rely on client-side filtering, but do style internal notes distinctly so a
staff user cannot mistake one for a customer-visible message.

Paging is keyset on `created_at DESC, id DESC`. Pass the returned `next_cursor`
back as `p_cursor`; a null `next_cursor` means the end. Limit is clamped to
1..100 server-side.

Writing an internal note (`add_portal_support_internal_note`) requires the
`support_internal_notes_rpc` flag. It is `true` on staging and `false` on
production, so the client must handle `FEATURE_DISABLED` as a hidden feature
rather than a failure.

## Things that are not available

- **No payout surface.** `partner_payouts` is `false` everywhere. Do not build
  payout request or approval flows against rc.5.
- **No production deployment.** Every RPC here is absent on production.
- **No public partner onboarding.** The intake RPC exists and works, but KYC,
  legal and fiscal questions are all open (`LEGAL_FISCAL_PROVIDER_DECISIONS.md`).
  Do not ship a consumer-facing "become a partner" flow.
- **No compliance fixtures outside staging.** `staff_set_partner_compliance_fixture`
  raises `FEATURE_DISABLED` wherever the flag is off, and the flag row does not
  exist on production. Never call it from a shipped build.
- **No partner type classification RPC.** Legacy `REVIEW_REQUIRED` partners
  cannot be classified through the API yet.

## Verified on staging

53/53 matrix checks green, including all seven detail RPCs, the three denial
paths, both internal-note visibility directions, the flag-off path, and full
INDIVIDUAL and BUSINESS activation. See `STAGING_MATRIX.md`.
