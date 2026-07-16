-- Phase 3: publieke product-RLS sluit conceptproducten uit
-- Reden: is_concept-kolom toegevoegd in phase2 maar oorspronkelijke policy niet bijgewerkt

DROP POLICY IF EXISTS "Public can read published products" ON products;

CREATE POLICY "Public can read published products" ON products
  FOR SELECT
  USING (status = 'PUBLISHED' AND is_concept = FALSE);
