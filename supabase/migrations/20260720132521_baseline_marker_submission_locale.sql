-- =============================================================================
-- BASELINE MARKER (no-op) - remote version 20260720132521
-- =============================================================================
-- PURPOSE: Align local migration history with remote apply-time version IDs.
-- REMOTE EVIDENCE (read-only, 2026-07-21):
--   supabase_migrations.schema_migrations:
--     version=20260720132521
--     name=submission_locale_columns
-- CLASSIFICATION: FUNCTIONALLY_EQUIVALENT to local 20260715190000_submission_locale
-- SCOPE: documentation / history alignment ONLY.
--   No schema changes. No data changes. No grants/policies.
-- CLEAN INSTALL: real locale columns are created by 20260715190000_*.sql (earlier).
-- PRODUCTION: do NOT re-apply locale DDL; companion history sync required before push
--   (mark local 20260715190000 as applied on remote - separate operator step).
-- WARNING: never repair --status reverted 20260720132521.
-- =============================================================================

SELECT 'baseline_marker_20260720132521'::text AS marker,
       'FUNCTIONALLY_EQUIVALENT'::text AS equivalence_class,
       '20260715190000_submission_locale'::text AS local_content_migration;
