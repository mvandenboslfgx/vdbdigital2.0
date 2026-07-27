# RC3 file classification (clean freeze worktree)

## RC3 REQUIRED
- supabase/migrations/20260725120000_messaging_support_appointments_rc3.sql
- supabase/migrations/20260725120100_messaging_support_appointments_rc3_rpcs.sql
- supabase/migrations/20260725120200_fix_appointment_rls_recursion.sql
- supabase/migrations/20260725120300_rc3_table_grants.sql
- contracts/releases/vdb-backend-contract-0.2.0-rc.3/**
- scripts/verify-messaging-support-appointments-contract.ts
- scripts/test-messaging-support-appointments-rls.ts
- package.json (script entries only)

## RC3 TEST
- tests/unit/messaging-support-appointments-contract.test.ts

## RC3 DOCUMENTATION
- docs/messaging-support-appointments-map.md
- docs/owner-contract-surface-audit.md
- docs/staging-rollout-messaging-support-appointments-rc3.md
- docs/OWNER_CONTRACT_RC3_STAGING_OPERATOR_READINESS.md
- docs/artifacts/rc3-apply-manifest.md
- docs/artifacts/rc3-staging-preflight.sql
- docs/artifacts/rc3-staging-preflight-run.sql
- docs/artifacts/rc3-staging-preflight-evidence.md
- docs/backend-contract.md (RC3 pin notes)

## GENERATED EVIDENCE (include fresh after gates; prior copies ok as baseline)
- docs/artifacts/messaging-support-appointments-rc3-verify.json
- docs/artifacts/messaging-support-appointments-rls-rpc-results.json

## UNRELATED — EXCLUDE (remain in dirty primary only)
- docs/artifacts/live-readiness/** (operator evidence + scratch _*.js)
- marketing/MFA/catalog/lighthouse/perf/tmp files
- all modified src/** from dirty tree
