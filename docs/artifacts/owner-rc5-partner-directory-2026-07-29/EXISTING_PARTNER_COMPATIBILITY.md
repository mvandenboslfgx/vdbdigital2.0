# Existing Partner Compatibility — rc.5

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Concern: rc.5 introduces an activation checklist that did not exist when the
  current partners were activated. Applying it retroactively would deactivate
  live partners or fabricate verification state. Neither is acceptable.

## The compatibility strategy

Two additive columns carry the entire strategy:

| Column | Default | Backfill rule |
| --- | --- | --- |
| `legacy_activation_grandfathered` | `false` | Set `true` for every row already `status = 'ACTIVE'` |
| `type_classification_status` | `'UNKNOWN'` | Set `REVIEW_REQUIRED` for every row with `partner_type IS NULL` |

Explicitly **not** touched by the backfill in `20260729140000`:

- `status` — nobody is deactivated
- `payout_eligible` — no money-facing flag flips
- `compliance_status` — owned by the compliance flow
- `partner_type` — never inferred, stays NULL

Verification statuses keep their fail-closed defaults (`NOT_STARTED`), which
truthfully records "we have not verified this" rather than inventing a pass.

## Consequences for a legacy ACTIVE partner

| Capability | Effect |
| --- | --- |
| Stays `ACTIVE` | Yes, untouched |
| Keeps `payout_eligible` | Yes, untouched |
| Appears in `admin_list_partners` / `admin_get_partner` | Yes, with `legacy_activation_grandfathered = true` and `type_classification_status = REVIEW_REQUIRED` |
| Could be re-activated from scratch today | No — the checklist would report `PARTNER_TYPE_UNKNOWN`, `AGE_NOT_VERIFIED`, `IDENTITY_NOT_VERIFIED`, `AGREEMENT_NOT_ACCEPTED`, `PAYOUT_PROFILE_NOT_APPROVED` |
| Reactivation after suspension | Allowed via the grandfathered branch of `reactivate_partner`, which restores rc.4 behaviour without applying the checklist |

The asymmetry is deliberate: rc.5 never revokes an existing grant, but it also
never pretends a legacy partner satisfies the new bar.

## Staging observations

| Metric | Value |
| --- | --- |
| `partner_profiles` total | 5 |
| ACTIVE | 3 |
| ACTIVE and grandfathered | 3 |
| ACTIVE and **not** grandfathered | 0 |
| Legacy ACTIVE rows on `REVIEW_REQUIRED` | 3 of 3 |

Matrix checks:

| Check | Result | Evidence |
| --- | --- | --- |
| `legacy:pre_active_all_grandfathered` | PASS | 3 pre-existing ACTIVE partners, all grandfathered |
| `legacy:pre_active_still_active` | PASS | 3/3 still ACTIVE after the full run, by id |
| `legacy:review_required_preserved` | PASS | All three still `REVIEW_REQUIRED` |
| `legacy:active_population_restored` | PASS | ACTIVE count before = 3, after = 3 |

The first check is snapshotted by id before any synthetic seeding and re-checked
after cleanup, so it detects collateral damage from the matrix itself, not just
from the migration.

New partners created by the matrix were `legacy_activation_grandfathered = false`
(check `activation:individual_row_active`), confirming the grandfather marker is
not handed out to anything that went through the rc.5 gate.

## Production

Production `nhsrdnjfsxfikfbdmdfj` has **not** received any rc.5 migration:
migration tip `20260728213625`, zero rc.5 columns, zero rc.5 RPCs. Its 2 ACTIVE
partners are therefore unaffected and un-migrated. When rc.5 eventually reaches
production the same backfill will mark those rows grandfathered; that has not
happened and is not authorized.

## Forward path for legacy partners

1. Staff classify each `REVIEW_REQUIRED` partner as `INDIVIDUAL` or `BUSINESS`.
   No RPC exists for this yet — currently an operator update. Recommended rc.6
   work.
2. Collect real age and identity verification through whichever provider is
   chosen (open — see `LEGAL_FISCAL_PROVIDER_DECISIONS.md`).
3. Have them accept the legally reviewed agreement once it exists (the current
   agreement bodies are non-binding placeholders).
4. Move the payout profile to `APPROVED` through a real review, not a fixture.
5. Only then clear `legacy_activation_grandfathered`, so a suspension/reactivation
   cycle applies the full checklist.

Step 5 is the point at which a legacy partner stops being an exception. Nothing
forces that timeline in rc.5.
