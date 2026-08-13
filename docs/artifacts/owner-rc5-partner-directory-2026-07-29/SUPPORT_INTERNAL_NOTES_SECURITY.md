# Support Internal Notes — Security Review

- Contract: `vdb-backend-contract@0.2.0-rc.5`
- Writer: `add_portal_support_internal_note(uuid, text) -> uuid`
  (`supabase/migrations/20260725120100_messaging_support_appointments_rc3_rpcs.sql`)
- Reader: `list_portal_support_ticket_replies(uuid, int, timestamptz) -> jsonb`
  (`supabase/migrations/20260729140200_admin_directory_detail_rc5_rpcs.sql`)
- Flag: `support_internal_notes_rpc` (staging `true`, production `false`)

## Threat model

An internal note is staff-to-staff commentary attached to a customer support
ticket. The failure that matters is a customer reading it. Three things must
hold simultaneously:

1. Only staff can create a note.
2. The note must be stored in a way that is distinguishable from a public reply.
3. Every read path must filter on that distinction, not just the UI.

## Control 1 — write is staff-gated and flag-gated

`add_portal_support_internal_note` checks, in order:

1. `auth.uid()` present, else `AUTH_REQUIRED`.
2. `public.is_staff_admin()`, else `FORBIDDEN`.
3. `public.feature_flag_enabled(ARRAY['support_internal_notes_rpc'])`, else
   `FEATURE_DISABLED`.
4. Non-empty body, else `VALIDATION_FAILED`.
5. Ticket exists, else `NOT_FOUND`.

The insert hard-codes `is_internal = true`; the caller cannot choose. An audit
row (`portal.support.internal_note`) is written carrying only the ticket id, no
body content.

Note the ordering: the role check precedes the flag check, so a non-staff caller
learns nothing about flag state.

## Control 2 — storage marks the note

Notes and public replies share `portal_support_replies`, discriminated by the
`is_internal` boolean. Column is NOT NULL with a default, so a reply cannot end
up in an indeterminate state.

## Control 3 — read paths filter server-side

`list_portal_support_ticket_replies` resolves the ticket's organization, then:

```
IF NOT v_is_staff AND NOT public.is_org_member(v_org_id) THEN
  RAISE EXCEPTION 'FORBIDDEN';
END IF;
...
WHERE r.ticket_id = p_ticket_id
  AND (v_is_staff OR r.is_internal = false)
```

The filter is inside the query, not applied after fetching. `is_org_member`
additionally requires membership `status = 'ACTIVE'`, so a removed or merely
invited member cannot read the ticket at all.

Three distinct outcomes:

| Caller | Outcome |
| --- | --- |
| Staff | All replies, internal included |
| Active member of the ticket's organization | Public replies only |
| Anyone else (including a partner) | `FORBIDDEN` |

A partner has no path to this RPC unless they also happen to be an active member
of that specific customer organization.

## Fail-closed behaviour

`feature_flag_enabled` returns `false` when the `feature_flags` table is absent
or the key is missing, so a partially migrated environment denies rather than
allows. The flag defaults to `false` in `20260729140000` and is enabled only by
an explicit operator statement.

The flag gates **writing** notes. It does not gate reading: if the flag were
disabled after notes already existed, staff could still read them and customers
still could not. That is the correct direction for a kill switch.

## Staging verification

| Scenario | Expected | Observed |
| --- | --- | --- |
| Staff adds a note (flag on) | Succeeds, `is_internal = true` | PASS |
| Staff lists replies | 2 replies, internal body visible | PASS |
| Customer (active org member) lists replies | 1 reply, zero internal, internal body string absent | PASS |
| Partner who is not a member lists replies | `FORBIDDEN` | PASS |
| Staff adds a note with the flag off | `FEATURE_DISABLED` | PASS |
| Flag restored afterwards | `true` | PASS |

The customer-side assertion is a substring probe for the marker
`SYNTH_INTERNAL_NOTE_BODY` across the entire serialised response, so it would
catch a leak through any key, not just `body`.

## Residual risks

1. **Author identity is exposed.** `author_user_id` is returned to org members
   for public replies. That is a staff user id, not a name or email, but it is
   correlatable. Accepted for rc.5.
2. **No note redaction or edit trail.** A note written in error can only be
   deleted at the table level by an operator; there is no RPC for it and no
   tombstone. Out of scope for rc.5.
3. **Flag is global, not per-tenant.** Disabling it stops internal notes
   everywhere. Acceptable for a kill switch.
4. **Production is unverified by design.** The flag is `false` on production and
   was not touched. Behaviour there is the fail-closed path only.
