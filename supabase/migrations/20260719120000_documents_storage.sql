-- Documents & Supabase Storage foundation (forward-only, local apply only).
-- Canonical table remains public.portal_files (no second documents model).
-- CHECKOUT / Mollie / remote apply: out of scope.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.portal_document_category AS ENUM (
    'GENERAL', 'PROJECT_FILE', 'DELIVERABLE', 'QUOTE', 'INVOICE', 'CONTRACT',
    'BRIEFING', 'DESIGN', 'CONTENT', 'REPORT', 'SUPPORT_ATTACHMENT', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_document_visibility AS ENUM (
    'INTERNAL', 'CUSTOMER_VISIBLE', 'CUSTOMER_UPLOAD', 'RESTRICTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_document_status AS ENUM (
    'UPLOADING', 'AVAILABLE', 'QUARANTINED', 'REJECTED', 'ARCHIVED', 'DELETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_document_scan_status AS ENUM (
    'NOT_REQUIRED', 'PENDING', 'CLEAN', 'SUSPICIOUS', 'INFECTED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.portal_document_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_portal_document_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.portal_document_number_seq');
  RETURN 'DOC-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_portal_document_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_portal_document_number() TO service_role;

-- ---------------------------------------------------------------------------
-- Extend portal_files (canonical documents table)
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_files
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category public.portal_document_category NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS safe_filename TEXT,
  ADD COLUMN IF NOT EXISTS file_extension TEXT,
  ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS visibility public.portal_document_visibility NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS status public.portal_document_status NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS version_number INT NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.portal_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES public.portal_project_deliverables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES public.portal_support_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_summary TEXT,
  ADD COLUMN IF NOT EXISTS scan_status public.portal_document_scan_status NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS scan_provider TEXT,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_reference TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill
UPDATE public.portal_files
SET document_number = public.generate_portal_document_number()
WHERE document_number IS NULL;

UPDATE public.portal_files
SET title = coalesce(nullif(btrim(title), ''), file_name)
WHERE title IS NULL OR btrim(title) = '';

UPDATE public.portal_files
SET safe_filename = coalesce(nullif(btrim(safe_filename), ''), file_name)
WHERE safe_filename IS NULL OR btrim(safe_filename) = '';

UPDATE public.portal_files
SET file_extension = lower(coalesce(
  nullif(substring(file_name from '\.([^.]+)$'), ''),
  'bin'
))
WHERE file_extension IS NULL;

UPDATE public.portal_files
SET visibility = CASE
  WHEN customer_visible THEN 'CUSTOMER_VISIBLE'::public.portal_document_visibility
  ELSE 'INTERNAL'::public.portal_document_visibility
END
WHERE TRUE;

ALTER TABLE public.portal_files
  ALTER COLUMN document_number SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN safe_filename SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_files_document_number
  ON public.portal_files(document_number);

CREATE INDEX IF NOT EXISTS idx_portal_files_org_status
  ON public.portal_files(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_portal_files_project
  ON public.portal_files(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_files_deliverable
  ON public.portal_files(deliverable_id)
  WHERE deliverable_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_files_parent
  ON public.portal_files(parent_document_id)
  WHERE parent_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_files_current
  ON public.portal_files(organization_id, is_current)
  WHERE is_current = TRUE;

-- Sync visibility ↔ customer_visible
CREATE OR REPLACE FUNCTION public.portal_files_sync_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility IN ('CUSTOMER_VISIBLE', 'CUSTOMER_UPLOAD') THEN
    NEW.customer_visible := TRUE;
  ELSE
    NEW.customer_visible := FALSE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portal_files_sync_visibility ON public.portal_files;
CREATE TRIGGER trg_portal_files_sync_visibility
  BEFORE INSERT OR UPDATE ON public.portal_files
  FOR EACH ROW EXECUTE FUNCTION public.portal_files_sync_visibility();

-- Download audit (no signed URLs stored)
CREATE TABLE IF NOT EXISTS public.portal_document_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.portal_files(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_audience TEXT NOT NULL CHECK (actor_audience IN ('STAFF', 'CUSTOMER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_doc_downloads_doc
  ON public.portal_document_download_events(document_id, created_at DESC);

ALTER TABLE public.portal_document_download_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_document_download_events FROM anon, authenticated;
-- Staff reads via service role only

-- ---------------------------------------------------------------------------
-- RLS: tighten customer SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portal_files_member_select ON public.portal_files;
CREATE POLICY portal_files_member_select ON public.portal_files
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (
      status = 'AVAILABLE'
      AND archived_at IS NULL
      AND visibility IN ('CUSTOMER_VISIBLE', 'CUSTOMER_UPLOAD')
      AND scan_status IN ('NOT_REQUIRED', 'CLEAN')
      AND public.is_org_member(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Buckets: expand allowed MIME types (remain private)
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET
  public = false,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ],
  file_size_limit = CASE id
    WHEN 'project-files' THEN 52428800
    ELSE 26214400
  END
WHERE id IN (
  'customer-documents',
  'project-files',
  'quote-documents',
  'invoice-documents',
  'support-attachments'
);

-- Ensure buckets exist (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('customer-documents', 'customer-documents', false, 26214400,
    ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip']),
  ('project-files', 'project-files', false, 52428800,
    ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip']),
  ('quote-documents', 'quote-documents', false, 26214400, ARRAY['application/pdf']),
  ('invoice-documents', 'invoice-documents', false, 26214400, ARRAY['application/pdf']),
  ('support-attachments', 'support-attachments', false, 26214400,
    ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Keep restrictive deny policies for anon/authenticated (service-role after app authz)
-- Recreate deny policies if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portal_storage_deny_authenticated'
  ) THEN
    CREATE POLICY portal_storage_deny_authenticated ON storage.objects
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        bucket_id NOT IN (
          'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
        )
      )
      WITH CHECK (
        bucket_id NOT IN (
          'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'portal_storage_deny_anon'
  ) THEN
    CREATE POLICY portal_storage_deny_anon ON storage.objects
      AS RESTRICTIVE FOR ALL TO anon
      USING (
        bucket_id NOT IN (
          'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
        )
      )
      WITH CHECK (
        bucket_id NOT IN (
          'customer-documents','project-files','quote-documents','invoice-documents','support-attachments'
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Verification RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_documents_storage_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN QUERY
  WITH checks AS (
    SELECT * FROM (VALUES
      (
        'table:portal_files',
        to_regclass('public.portal_files') IS NOT NULL,
        'portal_files canonical documents'
      ),
      (
        'table:portal_document_download_events',
        to_regclass('public.portal_document_download_events') IS NOT NULL,
        'download events'
      ),
      (
        'col:portal_files.status',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_files'
            AND column_name = 'status'
        ),
        'status'
      ),
      (
        'col:portal_files.checksum_sha256',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_files'
            AND column_name = 'checksum_sha256'
        ),
        'checksum'
      ),
      (
        'col:portal_files.deliverable_id',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_files'
            AND column_name = 'deliverable_id'
        ),
        'deliverable link'
      ),
      (
        'col:portal_files.parent_document_id',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_files'
            AND column_name = 'parent_document_id'
        ),
        'version parent'
      ),
      (
        'uniq:storage_path',
        EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.portal_files'::regclass
            AND contype = 'u'
        ) OR EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = 'portal_files'
            AND indexdef ILIKE '%bucket%storage_path%'
        ),
        'unique bucket+path'
      ),
      (
        'rls:portal_files',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_files'::regclass),
        'RLS on'
      ),
      (
        'rls:download_events',
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_document_download_events'::regclass),
        'RLS on'
      ),
      (
        'anon_deny:portal_files',
        NOT has_table_privilege('anon', 'public.portal_files', 'SELECT'),
        'anon no SELECT'
      ),
      (
        'bucket:customer-documents',
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'customer-documents' AND public = false),
        'private'
      ),
      (
        'bucket:project-files',
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-files' AND public = false),
        'private'
      ),
      (
        'bucket:quote-documents',
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'quote-documents' AND public = false),
        'private'
      ),
      (
        'bucket:invoice-documents',
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'invoice-documents' AND public = false),
        'private'
      ),
      (
        'bucket:support-attachments',
        EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'support-attachments' AND public = false),
        'private'
      ),
      (
        'no_checkout_coupling',
        NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'portal_files'
            AND column_name IN ('mollie_payment_id', 'checkout_session_id')
        ),
        'no payment columns'
      ),
      (
        'policy:portal_files_member_select',
        EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'portal_files'
            AND policyname = 'portal_files_member_select'
        ),
        'member select'
      )
    ) AS t(check_name, ok, detail)
  )
  SELECT c.check_name, c.ok, c.detail FROM checks c;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_documents_storage_contracts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_documents_storage_contracts() TO service_role;

-- Compatibility comment for operators
COMMENT ON TABLE public.portal_files IS
  'Canonical documents store (UI: Documenten/Bestanden). Do not create portal_documents duplicate.';
