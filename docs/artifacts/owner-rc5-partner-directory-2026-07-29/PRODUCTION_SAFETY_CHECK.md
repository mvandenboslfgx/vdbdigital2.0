# Production Safety Check

- Production project ref: `nhsrdnjfsxfikfbdmdfj`
- Staging project ref: `qzekuvmgfekzsowdecyk`
- Date: 2026-07-29

## Rule applied

Production was treated as read-only for the entire gate. Specifically:

- No DDL.
- No DML.
- No feature flag change.
- No migration push.
- No CLI connection. The Supabase CLI was never linked to, nor pointed at,
  production at any moment.

The only production access was a single read-only `SELECT` issued through the
Supabase MCP `execute_sql` tool.

## Link discipline

`supabase/.temp/project-ref` contained `qzekuvmgfekzsowdecyk` for the whole
session and was re-read immediately before each of the two write operations:

1. Before `supabase db push` of `20260729140400`.
2. Before each run of the staging matrix script.

`supabase projects list` returned exactly one project, `qzekuvmgfekzsowdecyk`
("VDB Digital Staging"), with `linked: true`. Production does not appear as a
linked project for this workspace.

A `--dry-run` push was performed first and reported exactly one pending
migration, confirming no unexpected migration would be swept along.

## Script-level interlock

`scripts/staging-partner-identity-directory-rc5-matrix.sql` opens with:

```
IF NOT EXISTS (
  SELECT 1 FROM public.feature_flags
  WHERE key = 'partner_compliance_fixtures' AND enabled
) THEN
  RAISE EXCEPTION 'REFUSING_TO_RUN: partner_compliance_fixtures is not enabled. This matrix is staging-only.';
END IF;
```

Production has no `partner_compliance_fixtures` row at all, so the script would
abort before its first write even if it were pointed at production by mistake.
This is a defence in depth, not the primary control.

## Production state, observed read-only

| Property | Value | Interpretation |
| --- | --- | --- |
| Migration tip | `20260728213625` | Pre-rc.5. Unchanged. |
| Migrations matching `2026072914%` | 0 | None of `20260729140000`–`20260729140400` present |
| `partner_profiles` total | 3 | Unchanged |
| `partner_profiles` where `status = 'ACTIVE'` | 2 | The two possibly-real ACTIVE partners, untouched |
| `feature_flags.support_internal_notes_rpc` | `false` | Untouched, still fail-closed |
| `feature_flags.partner_compliance_fixtures` | row absent | Staging-only fixtures never reached production |
| rc.5 columns on `partner_profiles` (`partner_type`, `legacy_activation_grandfathered`, `payout_profile_status`) | 0 of 3 present | Schema un-migrated |
| rc.5 RPCs (`admin_get_product`, `admin_get_partner`, `partner_activation_checklist`, `staff_set_partner_compliance_fixture`) | 0 of 4 present | Function surface un-migrated |

## Consequences

1. The two production ACTIVE partners are **not** grandfathered, because the
   backfill that sets `legacy_activation_grandfathered` has not run there. They
   will be marked grandfathered whenever rc.5 is eventually applied to
   production — that step is **not authorized** by this gate.
2. Production has no rc.5 detail RPCs. Mobile and Partners builds pointed at
   production will not find them. Both handoffs state this explicitly.
3. `support_internal_notes_rpc` remains `false` on production, so
   `add_portal_support_internal_note` raises `FEATURE_DISABLED` there. That is the
   intended fail-closed state.

## Repository-level constraints honoured

- No commit, no push, no tag, no branch switch, no stash.
- Branch remained `phase/shared-partner-backend` at
  `8e4d5f76c8ec609ca1f7bdf2f5553a07b773e591`.
- Pre-existing unrelated WIP in the working tree was left exactly as found; no
  cleanup, no reverts.
- No writes to the Mobile or Partners repositories.
- No APK built.

Files added by this gate, all uncommitted:

- `supabase/migrations/20260729140400_rc5_verifier_fixture_flag_exists_only.sql`
- `scripts/staging-partner-identity-directory-rc5-matrix.sql`
- `docs/evidence/owner-rc5-partner-directory-2026-07-29/` (this pack)

## Production authorization status

**PRODUCTION NOT AUTHORIZED.**

Applying rc.5 to `nhsrdnjfsxfikfbdmdfj` requires a separate owner decision that
this gate does not grant, and is in any case gated on the open legal, fiscal and
KYC items in `LEGAL_FISCAL_PROVIDER_DECISIONS.md`.
