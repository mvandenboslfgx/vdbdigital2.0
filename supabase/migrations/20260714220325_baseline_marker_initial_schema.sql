-- =============================================================================
-- BASELINE MARKER (no-op) - remote version 20260714220325
-- =============================================================================
-- PURPOSE: Align local migration history with remote apply-time version IDs.
-- REMOTE EVIDENCE (read-only, 2026-07-19):
--   supabase_migrations.schema_migrations:
--     version=20260714220325
--     name=20260714000000_initial_schema
--   Public base tables (20) match table set in
--     supabase/migrations/20260714000000_initial_schema.sql
-- CLASSIFICATION: FUNCTIONALLY_EQUIVALENT to local 20260714000000_initial_schema
--   (remote name points at local filename; object inventory matches; not byte-diffed).
-- SCOPE: documentation / history alignment ONLY.
--   No schema changes. No data changes. No grants/policies.
-- CLEAN INSTALL: real schema is still created by 20260714000000_*.sql (earlier).
-- PRODUCTION: do NOT re-apply baseline DDL; companion history sync required before push
--   (mark local 20260714000000 as applied on remote - separate operator step).
-- These markers do NOT claim local content timestamps are already applied remotely.
-- =============================================================================

SELECT 'baseline_marker_20260714220325'::text AS marker,
       'FUNCTIONALLY_EQUIVALENT'::text AS equivalence_class,
       '20260714000000_initial_schema'::text AS local_content_migration;
