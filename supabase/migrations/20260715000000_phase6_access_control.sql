-- Phase 6: Zero-trust access control — RLS hardening

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Admin roles: authenticated users may read ONLY their own row
CREATE POLICY "Authenticated read own admin role" ON admin_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Deny authenticated write admin_roles" ON admin_roles
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny authenticated update admin_roles" ON admin_roles
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Deny authenticated delete admin_roles" ON admin_roles
  FOR DELETE TO authenticated USING (false);

-- Explicit deny authenticated on sensitive tables (defense in depth)
CREATE POLICY "Deny authenticated orders" ON orders
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated order_items" ON order_items
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated payments" ON payments
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated leads" ON leads
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated quote_requests" ON quote_requests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated contact_submissions" ON contact_submissions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated audit_logs" ON audit_logs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated webhook_events" ON webhook_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated site_settings" ON site_settings
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny authenticated customers" ON customers
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Products: authenticated users without admin service path cannot read drafts/concepts
CREATE POLICY "Deny authenticated read draft products" ON products
  FOR SELECT TO authenticated
  USING (status = 'PUBLISHED' AND is_concept = FALSE);

CREATE POLICY "Deny authenticated write products" ON products
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny authenticated update products" ON products
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Deny authenticated delete products" ON products
  FOR DELETE TO authenticated USING (false);

COMMENT ON COLUMN profiles.is_active IS 'FALSE = account gedeactiveerd, geen admin-toegang';
