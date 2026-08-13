# Staging Functional Matrix — rc.5 Partner Identity + Admin Directory Detail

- Script: `scripts/staging-partner-identity-directory-rc5-matrix.sql`
- Command: `npx supabase db query --linked -f scripts/staging-partner-identity-directory-rc5-matrix.sql`
- Project ref: `qzekuvmgfekzsowdecyk` (confirmed from `supabase/.temp/project-ref` immediately before the run)
- schemaVersion asserted: `2026.07.29.partner-identity-directory-rc5`
- Machine-readable result: `STAGING_MATRIX.json`

## Result

**53 / 53 PASS, 0 FAIL.**

## Safety properties of the script

- **Staging interlock.** The `DO` block aborts with `REFUSING_TO_RUN` unless the
  staging-only flag `partner_compliance_fixtures` is enabled. Production has no
  such flag row, so the script cannot execute there even if pointed at it.
- **Synthetic data only.** Every identity is a fresh `gen_random_uuid()` with an
  `@example.invalid` address. No real person, organisation, product or ticket is
  read for content or mutated.
- **Self-cleaning.** All synthetic rows are removed at the end. Post-run
  verification: `partner_profiles` back to 5 rows, 3 ACTIVE, 0 rows matching the
  synthetic naming pattern.
- **No production reachability.** The script only ever runs through the linked
  CLI connection.

## Requirement coverage

### 1. Verifier fail counts = 0

| Check | Result |
| --- | --- |
| `verify:rc5` | pass=53 fail=0 |
| `verify:rc4` | pass=40 fail=0 |
| `verify:messaging` | pass=33 fail=0 |
| `verify:partner_admin` | pass=30 fail=0 |

The single pre-existing failure (`flag:partner_compliance_fixtures`, which
asserted the flag was literally `false`) was resolved by migration
`20260729140400`, which changes that assertion to an existence check. The
fail-closed guarantee is unchanged and is still proven by `fixtures:flag_gated`.

### 2. Detail RPCs exist and work for a staff caller

Executed as `postgres` with JWT claim simulation
(`request.jwt.claim.sub` + `request.jwt.claims`) for a synthetic `SUPPORT` staff
profile seeded into `profiles` + `admin_roles`.

| Check | Result | Evidence |
| --- | --- | --- |
| `auth:jwt_simulation_resolves` | PASS | `auth.uid()` resolves to the staff user, `is_staff_admin() = true` |
| `detail:admin_get_product` | PASS | Correct id, rc.5 `schema_version`, `eligibility` block present |
| `detail:admin_get_partner` | PASS | Correct id, `partner_type = BUSINESS`, live `activation_checklist` embedded |
| `detail:admin_get_customer` | PASS | Correct id, `project_count` + `open_ticket_count` present |
| `detail:admin_get_project` | PASS | Quote / invoice / appointment counts all >= 1 |
| `detail:admin_get_quote` | PASS | 1 line item, `total_cents = 121000` |
| `detail:admin_get_invoice` | PASS | `amount_due_cents = 121000` |
| `detail:admin_get_appointment` | PASS | `notes_customer_safe` is NULL |
| `detail:not_found_contract` | PASS | Unknown id raises `NOT_FOUND` |

Data-minimisation assertions (negative probes against deliberately poisoned
seed values):

| Check | Result | What it proves |
| --- | --- | --- |
| `detail:product_no_cost_or_supplier` | PASS | `cost_cents` was seeded as `42424`; that value appears nowhere in the payload |
| `detail:customer_no_pii` | PASS | No `contact_email`, `contact_phone`, `kvk_number`, `vat_number`, `invoice_address` keys |
| `detail:quote_no_customer_note` | PASS | Seeded `SYNTHETIC_CUSTOMER_NOTE_MUST_NOT_LEAK` absent from the payload |
| `detail:appointment_no_link_or_notes` | PASS | Seeded meeting link and internal note markers both absent |

### 3. Customer / partner / anon denial on `admin_get_product`

| Check | Result | Error |
| --- | --- | --- |
| `deny:customer_admin_get_product` | PASS | `FORBIDDEN` |
| `deny:partner_admin_get_product` | PASS | `FORBIDDEN` |
| `deny:anon_admin_get_product` | PASS | `permission denied for function admin_get_product` (via `SET LOCAL ROLE anon`) |
| `deny:anon_grant_absent` | PASS | `anon` has no EXECUTE on any of the seven detail RPCs |

Note the two different denial layers: authenticated non-staff callers are
rejected by the function body (`FORBIDDEN`), while `anon` never reaches the body
at all because the EXECUTE grant is revoked.

### 4. Internal support notes

| Check | Result | Evidence |
| --- | --- | --- |
| `notes:staff_add_internal_note` | PASS | Staff call succeeds; reply row persisted with `is_internal = true` |
| `notes:staff_list_includes_internal` | PASS | Staff sees 2 replies including the internal note body |
| `notes:customer_list_excludes_internal` | PASS | Org-member customer sees 1 reply, zero internal, and the internal body string is absent |
| `notes:non_member_forbidden` | PASS | A partner who is neither staff nor an org member gets `FORBIDDEN` |

### 5. Flag-off path

| Check | Result | Evidence |
| --- | --- | --- |
| `flag:internal_notes_off_denies` | PASS | With `support_internal_notes_rpc = false`, `add_portal_support_internal_note` raises `FEATURE_DISABLED` |
| `flag:internal_notes_restored` | PASS | Flag returned to `true` inside the same transaction |

The flag toggle happens inside the `DO` block, so an aborted run rolls the flag
back automatically rather than leaving staging in a half-configured state.

### 6. Individual submit without KvK, and approval-alone must not activate

| Check | Result | Evidence |
| --- | --- | --- |
| `intake:individual_with_kvk_rejected` | PASS | INDIVIDUAL + KvK raises `VALIDATION_FAILED` |
| `intake:individual_submit_pending` | PASS | `status=PENDING`, `partner_type=INDIVIDUAL`, `classification=KNOWN`, `required_agreement_type=INDIVIDUAL_PARTNER` |
| `intake:individual_no_kvk_stored` | PASS | `partner_applications.kvk_number` is NULL for the particulier |
| `activation:staff_approval_alone_not_active` | PASS | After `review_partner_application(approve=true)` the profile is still `PENDING` with `staff_approved_at` set |
| `activation:block_codes_recorded` | PASS | `AGE_NOT_VERIFIED,IDENTITY_NOT_VERIFIED,AGREEMENT_NOT_ACCEPTED,PAYOUT_PROFILE_NOT_APPROVED` |
| `activation:checklist_denies_incomplete` | PASS | `can_activate = false` |
| `activation:premature_denied` | PASS | `activate_partner_profile` raises `ACTIVATION_DENIED:AGE_NOT_VERIFIED` |

### 7. Full synthetic INDIVIDUAL and BUSINESS activation

INDIVIDUAL:

| Check | Result | Evidence |
| --- | --- | --- |
| `fixtures:individual_applied` | PASS | Age + identity `VERIFIED`, payout profile `APPROVED`, and crucially `status` stays `PENDING` with `payout_eligible = false` |
| `agreement:individual_accepted` | PASS | Acceptance ledger row written |
| `activation:individual_checklist_green` | PASS | `can_activate = true`, `missing = []` |
| `activation:individual_success` | PASS | `status = active`, `payout_eligible = true`, `authorization_audit_id` returned |
| `activation:individual_row_active` | PASS | Row is `ACTIVE`, `compliance_status = OK`, `legacy_activation_grandfathered = false` |
| `activation:aal1_denied` | PASS | Same call at AAL1 raises `AAL2_REQUIRED` |

BUSINESS:

| Check | Result | Evidence |
| --- | --- | --- |
| `intake:business_bad_kvk_rejected` | PASS | 3-digit KvK raises `VALIDATION_FAILED` |
| `intake:business_submit_pending` | PASS | `PENDING`, `BUSINESS`, `BUSINESS_PARTNER` agreement |
| `activation:business_requires_business_verification` | PASS | With age/identity/payout satisfied but business verification still `NOT_STARTED`, the checklist reports `BUSINESS_NOT_VERIFIED` and refuses |
| `activation:business_success` | PASS | After business verification, OWNER at AAL2 activates: `status = active`, `payout_eligible = true` |
| `activation:idempotent_replay` | PASS | Replaying the same idempotency key returns the cached response |

### 8. Existing ACTIVE grandfathered rows

| Check | Result | Evidence |
| --- | --- | --- |
| `legacy:pre_active_all_grandfathered` | PASS | 3 pre-existing ACTIVE partners, all `legacy_activation_grandfathered = true`, none ACTIVE-without-grandfather |
| `legacy:pre_active_still_active` | PASS | 3/3 still ACTIVE after the full run |
| `legacy:review_required_preserved` | PASS | All three still `type_classification_status = REVIEW_REQUIRED` |
| `legacy:active_population_restored` | PASS | ACTIVE partners before = 3, after = 3 |

### 9. `partner_payouts` remains false

| Check | Result | Evidence |
| --- | --- | --- |
| `flag:partner_payouts_false` | PASS | `partner_payouts = false` |
| `flag:fixtures_and_notes_enabled` | PASS | The two staging operator flags are on, and only those two |

### 10. Production denylist

Covered in `PRODUCTION_SAFETY_CHECK.md`. Summary: the CLI stayed linked to
`qzekuvmgfekzsowdecyk` throughout; production `nhsrdnjfsxfikfbdmdfj` was touched
only through MCP `execute_sql` with a single read-only `SELECT`.

## Post-run staging state

| Metric | Value |
| --- | --- |
| Migration tip | `20260729140400` |
| `partner_profiles` total | 5 |
| ACTIVE | 3 |
| Grandfathered | 3 |
| Rows matching the synthetic naming pattern | 0 |
| `support_internal_notes_rpc` | `true` |
| `partner_compliance_fixtures` | `true` |
| `partner_payouts` | `false` |
