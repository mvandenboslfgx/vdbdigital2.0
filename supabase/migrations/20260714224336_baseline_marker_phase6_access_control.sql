-- =============================================================================
-- BASELINE MARKER (no-op) - remote version 20260714224336
-- =============================================================================
-- REMOTE EVIDENCE: version=20260714224336 name=phase6_access_control
-- CLASSIFICATION: FUNCTIONALLY_EQUIVALENT to 20260715000000_phase6_access_control
-- SCOPE: no-op history alignment only.
-- Does NOT claim local content timestamp is already applied remotely.
-- =============================================================================

SELECT 'baseline_marker_20260714224336'::text AS marker,
       'FUNCTIONALLY_EQUIVALENT'::text AS equivalence_class,
       '20260715000000_phase6_access_control'::text AS local_content_migration;
