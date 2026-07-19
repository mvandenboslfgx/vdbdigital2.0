-- =============================================================================
-- Quote status enum ordering bridge (forward-only)
-- =============================================================================
-- WHY THIS TIMESTAMP (20260719135000):
--   Sorts immediately before 20260719140000_quotes_acceptance.sql so that
--   PostgreSQL commits new portal_quote_status labels in a SEPARATE migration
--   transaction before 20260719140000 references them in RLS policies.
--
-- WHY NOT EDIT 20260719140000:
--   That file is already local-checkpointed; production has NOT applied it yet.
--   An ordering bridge avoids rewriting an existing migration body.
--
-- SCOPE (strict):
--   - Ensure public.portal_quote_status exists (created by customer_portal).
--   - Idempotently ADD VALUE for labels that 20260719140000 also ADDs and/or uses.
--   - No tables, data, functions, policies, grants, or storage changes.
--
-- ROOT CAUSE FIXED:
--   PG 55P04 — "unsafe use of new value SUPERSEDED" when ADD VALUE and policy
--   literals share one transaction (Supabase wraps each migration file in one TX).
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'portal_quote_status'
  ) THEN
    RAISE EXCEPTION
      'portal_quote_status missing — apply 20260717000000_customer_portal.sql first';
  END IF;
END $$;

-- All labels extended by 20260719140000 (only SUPERSEDED is referenced there,
-- but committing the full set here keeps ADD VALUE in that file a no-op).
DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'READY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'SUPERSEDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_quote_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
