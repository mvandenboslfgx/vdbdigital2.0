-- =============================================================================
-- BASELINE MARKER (no-op) - remote version 20260714220331
-- =============================================================================
-- REMOTE EVIDENCE: version=20260714220331 name=20260714100000_phase2_rls_webhooks
-- CLASSIFICATION: FUNCTIONALLY_EQUIVALENT to 20260714100000_phase2_rls_webhooks
-- SCOPE: no-op history alignment only.
-- Does NOT claim local content timestamp is already applied remotely.
-- =============================================================================

SELECT 'baseline_marker_20260714220331'::text AS marker,
       'FUNCTIONALLY_EQUIVALENT'::text AS equivalence_class,
       '20260714100000_phase2_rls_webhooks'::text AS local_content_migration;
