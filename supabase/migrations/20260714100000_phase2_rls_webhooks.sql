-- Phase 2: RLS completeness, webhook idempotency, concept products

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_concept BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'mollie';

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS external_event_id TEXT;

-- Backfill external_event_id from payment_id + event_type
UPDATE webhook_events
SET external_event_id = payment_id || ':' || event_type
WHERE external_event_id IS NULL;

ALTER TABLE webhook_events
  ALTER COLUMN external_event_id SET NOT NULL;

-- Replace composite unique constraint
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_payment_id_event_type_key;
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_external_id_key UNIQUE (provider, external_event_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_provider
  ON payments (id);

-- Enable RLS on tables that were missing it
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Deny-by-default: no public policies on sensitive tables
-- Service role bypasses RLS for server-side mutations

-- Audit logs: admins read via service role only; no public/anon write
CREATE POLICY "Deny anon insert audit_logs" ON audit_logs
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "Deny anon select audit_logs" ON audit_logs
  FOR SELECT TO anon USING (false);

-- Webhook events: server-only
CREATE POLICY "Deny anon webhook_events" ON webhook_events
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Orders: deny public access
CREATE POLICY "Deny anon orders" ON orders
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon order_items" ON order_items
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon payments" ON payments
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon leads" ON leads
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon quote_requests" ON quote_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon contact_submissions" ON contact_submissions
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon admin_roles" ON admin_roles
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon site_settings" ON site_settings
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Product features/FAQs: only via published products join (read via service or published product page server-side)
CREATE POLICY "Deny anon product_features write" ON product_features
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "Deny anon product_faqs write" ON product_faqs
  FOR INSERT TO anon WITH CHECK (false);

COMMENT ON COLUMN products.is_concept IS 'Conceptproduct — vereist review vóór commerciële publicatie';
