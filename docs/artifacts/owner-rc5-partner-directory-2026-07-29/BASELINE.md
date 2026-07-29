# Owner RC5 Gate — Baseline

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Bundle SHA256: `304f83cdc7ff98a525854d6be1a17bb8b5723c1dbcb2c44a5f35451a1cbd9f54`
- schemaVersion: `2026.07.29.partner-identity-directory-rc5`
- Date: 2026-07-29
- Branch: `phase/shared-partner-backend` @ `8e4d5f76c8ec609ca1f7bdf2f5553a07b773e591`
  (working tree carries unrelated WIP; nothing was committed, pushed, stashed or
  reverted for this gate)

## Environments

| Environment | Project ref | Role in this gate |
| --- | --- | --- |
| Staging | `qzekuvmgfekzsowdecyk` | Read + write. All rc.5 evidence produced here. |
| Production | `nhsrdnjfsxfikfbdmdfj` | Read-only via MCP `execute_sql`. No DDL, no DML, no flag change. |

The Supabase CLI was linked to `qzekuvmgfekzsowdecyk` for the entire session
(`supabase/.temp/project-ref`), re-read immediately before every write.

## Staging migration state

| Point in time | Migration tip |
| --- | --- |
| Session start (post-apply of the rc.5 set) | `20260729140300` |
| After this gate | `20260729140400` |

Applied rc.5 migrations:

| Migration | Purpose |
| --- | --- |
| `20260729140000_partner_identity_directory_rc5_schema.sql` | Enums, additive columns, agreement tables, placeholder agreements, conservative backfill, fail-closed flags |
| `20260729140100_partner_identity_directory_rc5_activation.sql` | Activation checklist, `partner_try_activate`, typed intake, review, `activate_partner_profile`, agreement acceptance, staging fixtures, reactivation, partner list |
| `20260729140200_admin_directory_detail_rc5_rpcs.sql` | `admin_get_*` detail RPCs, `list_portal_support_ticket_replies`, messaging verifier realignment |
| `20260729140300_partner_identity_directory_rc5_verify.sql` | rc.5 verifier, `admin_get_security_status` version bump, partner-admin verifier realignment |
| `20260729140400_rc5_verifier_fixture_flag_exists_only.sql` | **Added by this gate.** Relaxes the `flag:partner_compliance_fixtures` verifier check from "must be `false`" to "row must exist" |

### Why 20260729140400 was needed

`20260729140300` asserted `partner_compliance_fixtures = false`. Enabling the
fixtures on staging is a documented manual operator step, so the original check
turned the expected operator state into a verifier failure and made a zero-fail
verifier run unreachable on any environment that actually exercises the
fixtures. The new migration changes only that one check to an existence test.

Fail-closed behaviour is unchanged and still asserted:
`staff_set_partner_compliance_fixture` raises `FEATURE_DISABLED` unless the flag
is enabled, and the `fixtures:flag_gated` check proves that gate is present in
the function source. The seeded default in `20260729140000` remains `false`.

## Staging feature flags at gate time

| Flag | State | Note |
| --- | --- | --- |
| `support_internal_notes_rpc` | `true` | Operator-enabled on staging |
| `partner_compliance_fixtures` | `true` | Operator-enabled on staging; synthetic verification fixtures |
| `partner_payouts` | `false` | Unchanged. Money movement stays closed. |

## Staging partner population

| Metric | Value |
| --- | --- |
| `partner_profiles` total | 5 |
| `status = 'ACTIVE'` | 3 |
| `legacy_activation_grandfathered = true` | 3 |
| ACTIVE and not grandfathered | 0 |
| `type_classification_status` of the 3 legacy ACTIVE rows | `REVIEW_REQUIRED` |

## Local matrix (pre-existing)

`docs/artifacts/partner-identity-directory-rc5-local-matrix.json` — 118/118 PASS.

## Verifier baseline on staging

Measured before `20260729140400`:

| Verifier | Pass | Fail | Failing check |
| --- | --- | --- | --- |
| `verify_partner_identity_directory_rc5_contracts` | 52 | 1 | `flag:partner_compliance_fixtures` |
| `verify_admin_control_surface_contracts` | 40 | 0 | — |
| `verify_messaging_support_appointments_contracts` | 33 | 0 | — |
| `verify_partner_admin_contracts` | 30 | 0 | — |

Measured after `20260729140400`: 53 / 40 / 33 / 30, **zero failures across all four**.
