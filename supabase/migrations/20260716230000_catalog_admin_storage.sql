-- =============================================================================
-- Catalog product-media storage bucket (NOT applied in this hygiene step)
-- Private bucket; no anon/authenticated policies → fail-closed client access.
-- Uploads only via service-role server actions. See docs/CATALOG_ADMIN_STORAGE.md
-- Independent of P0.5 payment migrations.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Explicit deny policies for client roles on this bucket only
DROP POLICY IF EXISTS "product_media_deny_anon_select" ON storage.objects;
CREATE POLICY "product_media_deny_anon_select"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id <> 'product-media');

DROP POLICY IF EXISTS "product_media_deny_anon_mutate" ON storage.objects;
CREATE POLICY "product_media_deny_anon_mutate"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id <> 'product-media');

DROP POLICY IF EXISTS "product_media_deny_anon_update" ON storage.objects;
CREATE POLICY "product_media_deny_anon_update"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id <> 'product-media')
  WITH CHECK (bucket_id <> 'product-media');

DROP POLICY IF EXISTS "product_media_deny_anon_delete" ON storage.objects;
CREATE POLICY "product_media_deny_anon_delete"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id <> 'product-media');

DROP POLICY IF EXISTS "product_media_deny_authenticated_all" ON storage.objects;
CREATE POLICY "product_media_deny_authenticated_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id <> 'product-media')
  WITH CHECK (bucket_id <> 'product-media');

-- Path convention: products/{product_id}/{timestamp}-{safe-name}.{ext}
-- Max size: 5 MiB. MIME: jpeg/png/webp/gif. Never trust extension alone.
-- service_role bypasses RLS — keep it server-only.
