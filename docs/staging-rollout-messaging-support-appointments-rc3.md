# Staging rollout plan — messaging/support/appointments rc.3

**Status:** DOCUMENT ONLY — not executed  
**Contract:** `vdb-backend-contract@0.2.0-rc.3`  
**schemaVersion:** `2026.07.25.messaging-support-appointments-rc3`  
**Operator readiness:** [`docs/OWNER_CONTRACT_RC3_STAGING_OPERATOR_READINESS.md`](OWNER_CONTRACT_RC3_STAGING_OPERATOR_READINESS.md)  
**Exact apply manifest:** [`docs/artifacts/rc3-apply-manifest.md`](artifacts/rc3-apply-manifest.md)  
**Read-only preflight SQL:** [`docs/artifacts/rc3-staging-preflight.sql`](artifacts/rc3-staging-preflight.sql)

## Target

| Env | Ref |
| --- | --- |
| Staging apply target | `qzekuvmgfekzsowdecyk` |
| Production denylist | `nhsrdnjfsxfikfbdmdfj` |

## Preconditions

1. Local gate status is `OWNER CONTRACT RC.3 LOCAL PASS — STAGING NOT APPLIED`.
2. Operator readiness checklist green (staging SQL preflight by staging-authorized operator).
3. Explicit owner authorization for staging project + remote migrate.
4. Mobile/Partner repos **not** pinned until post-apply verify passes.

## Migrations to apply (forward only — exact order)

1. `20260725120000_messaging_support_appointments_rc3.sql`
2. `20260725120100_messaging_support_appointments_rc3_rpcs.sql`
3. `20260725120200_fix_appointment_rls_recursion.sql`
4. `20260725120300_rc3_table_grants.sql`

Hashes: see apply manifest. Do not reorder; enum `NEW` requires commit before default.

## Order

1. Backup / snapshot staging DB.
2. Run read-only preflight SQL; confirm absences/presences.
3. `npm run staging:assert-target` → exit 0.
4. Apply migrations via owner-approved Supabase path (never from Mobile/Partner; never production).
5. Run `verify_messaging_support_appointments_contracts()`.
6. Run staging-pointed contract verify scripts.
7. Keep feature flags fail-closed unless separately authorized.
8. Only then Mobile/Partner pin:

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.3
VDB_SCHEMA_VERSION=2026.07.25.messaging-support-appointments-rc3
Map: support_messages → portal_support_replies
```

## Rollback (schema)

- Prefer forward-fix; enum value `NEW` cannot be removed safely.
- Soft-disable via feature flags + revoke EXECUTE on mutation RPCs if emergency.
- Do not DROP `portal_*` tables with live data.
- Never `db reset` on staging/production.

## Explicit non-actions in this RC gate

- No remote apply (until owner auth after green preflight)
- No git push required for readiness docs
- No Mobile/Partner repo edits
- No production apply
- Checkout remains fail-closed (exit 2)
