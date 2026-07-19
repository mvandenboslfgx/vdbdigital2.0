-- =============================================================================
-- Invoice status enum ordering bridge (forward-only)
-- =============================================================================
-- WHY THIS TIMESTAMP (20260719155000):
--   Sorts immediately before 20260719160000_invoices_financial_documents.sql.
--   Same class of defect as quote SUPERSEDED: ADD VALUE + use in one TX → 55P04.
--
-- SCOPE (strict): enum ADD VALUE only. No tables/data/functions/policies.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'portal_invoice_status'
  ) THEN
    RAISE EXCEPTION
      'portal_invoice_status missing — apply 20260717000000_customer_portal.sql first';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'READY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'ISSUED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.portal_invoice_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
