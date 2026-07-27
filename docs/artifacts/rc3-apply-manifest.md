# RC.3 apply manifest (exact, reproducible)

**Status locked locally:** `OWNER CONTRACT RC.3 LOCAL PASS â€” STAGING NOT APPLIED`  
**Contract:** `vdb-backend-contract@0.2.0-rc.3`  
**schemaVersion:** `2026.07.25.messaging-support-appointments-rc3`  
**Bundle SHA256:** `62bb1c31240f5eb7e16968a6a03d425e52f2c2ef8b09c38c6cbd549ed331973f`  
**Evidence HEAD (unchanged):** `a593e5d395fc7b90994c5cb2e8554cd241c48706`  
**Generated:** 2026-07-25  

## Target identity (hard)

| Role | Project ref | Name | Action |
| --- | --- | --- | --- |
| Staging (only apply target) | `qzekuvmgfekzsowdecyk` | VDB Digital Staging | apply **after** green preflight + explicit auth |
| Production (denylist) | `nhsrdnjfsxfikfbdmdfj` | vdb nieuw | **NEVER** apply RC.3 from this gate |

## Forward-only migration set (exact order)

| # | Version | Filename | SHA256 (file) |
| --- | --- | ---: | --- |
| 1 | `20260725120000` | `20260725120000_messaging_support_appointments_rc3.sql` | `2a7bda8f49310bf1a24a73d227e984fe12d701f4c6b6394171d10ec91de88fc9` |
| 2 | `20260725120100` | `20260725120100_messaging_support_appointments_rc3_rpcs.sql` | `364f4c4e27674e4052aa092b260b05f872cfc962a46bf072326d4aabd10cab65` |
| 3 | `20260725120200` | `20260725120200_fix_appointment_rls_recursion.sql` | `37aa246f07bf4100ece20d12b425c85dd1ddb96cf76d720be2e96a52bd47968b` |
| 4 | `20260725120300` | `20260725120300_rc3_table_grants.sql` | `786919a0b3267c5eb8ed2ef1073e7c9916063593c168d77ba933891fd727ed00` |

**Ordering constraint:** enum `portal_ticket_status.NEW` is added in #1; default `NEW` is set only in #2 (requires prior commit). Do not squash into one transaction/file.

## Prerequisites already expected on staging (rc.2 baseline)

Staging must already include (non-exhaustive):

- Portal: `portal_conversations`, `portal_messages`, `portal_support_tickets`, `portal_support_replies`, â€¦
- Partner + ledger surfaces from rc.1
- Mobile compat: `20260724160000_mobile_compat_rc2.sql` (`feature_flags`, `feature_flag_enabled`)
- Grant hardening: `20260724103105_staging_cloud_grant_hardening.sql` (known prior staging apply)

If highest remote version &lt; `20260724160000`, **STOP** â€” apply rc.2 path first, not RC.3 alone.

## Post-apply verification (staging only)

```sql
SELECT check_name, ok, detail
FROM public.verify_messaging_support_appointments_contracts()
WHERE ok IS NOT TRUE;
-- expect: zero rows
```

```bash
# With staging-only env (never production URL/keys)
npm run db:verify-messaging-support-appointments
# Optional multi-user suite against staging DB container/link â€” operator only
npm run test:messaging-support-appointments-rls
```

Assert flags remain fail-closed:

- `messaging_realtime = false`
- `support_internal_notes_rpc = false`
- `appointments_booking = false`

## Rollback posture

| Risk | Response |
| --- | --- |
| Enum `NEW` | cannot remove safely â€” forward-fix only |
| Bad RPC behaviour | `REVOKE EXECUTE` on mutation RPCs; keep tables |
| Feature exposure | leave flags `false` |
| Data loss | never `DROP` portal tables; never `db reset` on staging |

## Explicit non-actions until authorized

- No Mobile/Partner pin edits
- No preview/APK rebuild for contract pin
- No production apply
- Checkout remains fail-closed (gate exit **2**)

