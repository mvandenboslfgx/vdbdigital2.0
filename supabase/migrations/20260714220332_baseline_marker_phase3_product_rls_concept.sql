-- =============================================================================
-- BASELINE MARKER (no-op) - remote version 20260714220332
-- =============================================================================
-- REMOTE EVIDENCE: version=20260714220332 name=20260714230000_phase3_product_rls_concept
-- CLASSIFICATION: FUNCTIONALLY_EQUIVALENT to 20260714230000_phase3_product_rls_concept
-- SCOPE: no-op history alignment only.
-- Does NOT claim local content timestamp is already applied remotely.
-- =============================================================================

SELECT 'baseline_marker_20260714220332'::text AS marker,
       'FUNCTIONALLY_EQUIVALENT'::text AS equivalence_class,
       '20260714230000_phase3_product_rls_concept'::text AS local_content_migration;
