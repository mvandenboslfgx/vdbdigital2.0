-- Remove legacy Tawk.to catalog records (forward-only, local apply only).
-- Exact slug / name / SKU matching only — no broad LIKE '%chat%' deletions.
-- Does not enable checkout. Does not grant legal approval.
-- Not applied remotely by this change set.

-- Archive matching products (idempotent)
UPDATE public.products
SET
  status = 'ARCHIVED',
  is_concept = TRUE,
  publication_ready = FALSE,
  updated_at = NOW()
WHERE slug = 'tawk-to-livechat-installatie'
   OR lower(coalesce(internal_sku, '')) IN (
     'tawk-to-livechat-installatie',
     'prod-tawk-installatie',
     'tawk-livechat-setup'
   )
   OR name ILIKE '%tawk.to%'
   OR name ILIKE '%tawk to%';

-- Delete empty livechat category when no products remain
DELETE FROM public.categories c
WHERE c.slug = 'livechat'
  AND NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.category_id = c.id
  );
