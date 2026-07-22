-- =============================================================================
-- Partner RLS + core RPCs (authorization inside functions)
-- Grants: authenticated execute; functions enforce partner vs staff.
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

-- ---------- RLS policies ----------
-- Deny anon by default (no policies for anon)

-- partner_profiles
DROP POLICY IF EXISTS partner_profiles_select_own ON public.partner_profiles;
CREATE POLICY partner_profiles_select_own ON public.partner_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_admin());

DROP POLICY IF EXISTS partner_profiles_staff_all ON public.partner_profiles;
CREATE POLICY partner_profiles_staff_all ON public.partner_profiles
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- partner_applications
DROP POLICY IF EXISTS partner_applications_select_own ON public.partner_applications;
CREATE POLICY partner_applications_select_own ON public.partner_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_admin());

DROP POLICY IF EXISTS partner_applications_insert_own ON public.partner_applications;
CREATE POLICY partner_applications_insert_own ON public.partner_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS partner_applications_update_own_draft ON public.partner_applications;
CREATE POLICY partner_applications_update_own_draft ON public.partner_applications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('DRAFT', 'SUBMITTED'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS partner_applications_staff_all ON public.partner_applications;
CREATE POLICY partner_applications_staff_all ON public.partner_applications
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- partner_codes
DROP POLICY IF EXISTS partner_codes_select_own ON public.partner_codes;
CREATE POLICY partner_codes_select_own ON public.partner_codes
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (
      SELECT 1 FROM public.partner_profiles pp
      WHERE pp.id = partner_id AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS partner_codes_staff_write ON public.partner_codes;
CREATE POLICY partner_codes_staff_write ON public.partner_codes
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- partner_leads
DROP POLICY IF EXISTS partner_leads_select_own ON public.partner_leads;
CREATE POLICY partner_leads_select_own ON public.partner_leads
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (
      SELECT 1 FROM public.partner_profiles pp
      WHERE pp.id = partner_id AND pp.user_id = auth.uid() AND pp.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS partner_leads_staff_write ON public.partner_leads;
CREATE POLICY partner_leads_staff_write ON public.partner_leads
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- partner_sales / commissions / payouts / ledger / cash / adjustments: partner read own; staff write via RPC mostly
DROP POLICY IF EXISTS partner_sales_select_own ON public.partner_sales;
CREATE POLICY partner_sales_select_own ON public.partner_sales
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS partner_commissions_select_own ON public.partner_commissions;
CREATE POLICY partner_commissions_select_own ON public.partner_commissions
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS partner_payout_requests_select_own ON public.partner_payout_requests;
CREATE POLICY partner_payout_requests_select_own ON public.partner_payout_requests
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS partner_payouts_select_own ON public.partner_payouts;
CREATE POLICY partner_payouts_select_own ON public.partner_payouts
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS partner_ledger_entries_select_own ON public.partner_ledger_entries;
CREATE POLICY partner_ledger_entries_select_own ON public.partner_ledger_entries
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS partner_ledger_tx_select_staff ON public.partner_ledger_transactions;
CREATE POLICY partner_ledger_tx_select_staff ON public.partner_ledger_transactions
  FOR SELECT TO authenticated
  USING (public.is_staff_admin());

DROP POLICY IF EXISTS partner_cash_receipts_select ON public.partner_cash_receipts;
CREATE POLICY partner_cash_receipts_select ON public.partner_cash_receipts
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR (partner_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS partner_adjustments_select ON public.partner_adjustments;
CREATE POLICY partner_adjustments_select ON public.partner_adjustments
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id = partner_id AND pp.user_id = auth.uid())
  );

-- Direct INSERT/UPDATE/DELETE on financial tables denied for authenticated (no policies) — mutations via RPC as SECURITY DEFINER

-- ---------- Internal: post balanced ledger ----------
CREATE OR REPLACE FUNCTION public._partner_post_ledger(
  p_type text,
  p_ref_type text,
  p_ref_id uuid,
  p_currency text,
  p_idempotency text,
  p_actor uuid,
  p_entries jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx uuid;
  v_e jsonb;
BEGIN
  SELECT id INTO v_tx
  FROM public.partner_ledger_transactions
  WHERE idempotency_key = p_idempotency;

  IF v_tx IS NOT NULL THEN
    RETURN v_tx;
  END IF;

  INSERT INTO public.partner_ledger_transactions (
    transaction_type, reference_type, reference_id, currency, idempotency_key, actor_user_id
  ) VALUES (
    p_type, p_ref_type, p_ref_id, p_currency, p_idempotency, p_actor
  )
  RETURNING id INTO v_tx;

  FOR v_e IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO public.partner_ledger_entries (
      transaction_id, account, partner_id, debit_cents, credit_cents
    ) VALUES (
      v_tx,
      (v_e->>'account')::public.partner_ledger_account,
      NULLIF(v_e->>'partner_id', '')::uuid,
      COALESCE((v_e->>'debit_cents')::bigint, 0),
      COALESCE((v_e->>'credit_cents')::bigint, 0)
    );
  END LOOP;

  RETURN v_tx;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_tx
    FROM public.partner_ledger_transactions
    WHERE idempotency_key = p_idempotency;
    RETURN v_tx;
END;
$$;

REVOKE ALL ON FUNCTION public._partner_post_ledger(text,text,uuid,text,text,uuid,jsonb) FROM PUBLIC;

-- Available liability: commissions APPROVED not yet paid - adjustments
CREATE OR REPLACE FUNCTION public.partner_available_liability_cents(p_partner_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
    COALESCE((
      SELECT SUM(amount_cents) FROM public.partner_commissions
      WHERE partner_id = p_partner_id AND status IN ('APPROVED', 'PAID')
    ), 0)
    - COALESCE((
      SELECT SUM(amount_cents) FROM public.partner_payouts
      WHERE partner_id = p_partner_id AND status IN ('PENDING', 'PAID')
    ), 0)
    - COALESCE((
      SELECT SUM(requested_amount_cents) FROM public.partner_payout_requests
      WHERE partner_id = p_partner_id AND status = 'REQUESTED'
    ), 0)
    + COALESCE((
      SELECT SUM(amount_cents) FROM public.partner_adjustments
      WHERE partner_id = p_partner_id
    ), 0)
  );
$$;

REVOKE ALL ON FUNCTION public.partner_available_liability_cents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_available_liability_cents(uuid) TO authenticated;

-- submit application
CREATE OR REPLACE FUNCTION public.submit_partner_application(
  p_legal_name text,
  p_trade_name text,
  p_contact_email text,
  p_kvk text DEFAULT NULL,
  p_vat text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT id INTO v_id
  FROM public.partner_applications
  WHERE user_id = auth.uid()
    AND status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    UPDATE public.partner_applications
    SET status = 'SUBMITTED',
        legal_name = p_legal_name,
        trade_name = p_trade_name,
        contact_email = p_contact_email,
        kvk_number = p_kvk,
        vat_number = p_vat,
        contact_phone = p_phone,
        submitted_at = COALESCE(submitted_at, NOW()),
        updated_at = NOW(),
        version = version + 1
    WHERE id = v_id;
  ELSE
    INSERT INTO public.partner_applications (
      user_id, status, legal_name, trade_name, contact_email, kvk_number, vat_number, contact_phone, submitted_at
    ) VALUES (
      auth.uid(), 'SUBMITTED', p_legal_name, p_trade_name, p_contact_email, p_kvk, p_vat, p_phone, NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.partner_profiles (user_id, status, legal_name, display_name)
  VALUES (auth.uid(), 'PENDING', p_legal_name, COALESCE(p_trade_name, p_legal_name))
  ON CONFLICT (user_id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
  WHERE public.partner_profiles.status = 'PENDING';

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) TO authenticated;

-- review application
CREATE OR REPLACE FUNCTION public.review_partner_application(
  p_application_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL,
  p_partner_code text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.partner_applications%ROWTYPE;
  v_partner_id uuid;
  v_code text;
BEGIN
  IF NOT public.is_staff_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_app FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF p_approve THEN
    UPDATE public.partner_applications
    SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = auth.uid(), updated_at = NOW()
    WHERE id = p_application_id;

    INSERT INTO public.partner_profiles (user_id, status, legal_name, display_name, payout_eligible, compliance_status)
    VALUES (v_app.user_id, 'ACTIVE', v_app.legal_name, COALESCE(v_app.trade_name, v_app.legal_name), TRUE, 'OK')
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'ACTIVE',
          payout_eligible = TRUE,
          compliance_status = 'OK',
          legal_name = EXCLUDED.legal_name,
          display_name = EXCLUDED.display_name,
          updated_at = NOW(),
          revoked_at = NULL,
          suspended_at = NULL
    RETURNING id INTO v_partner_id;

    v_code := public.normalize_partner_code(COALESCE(p_partner_code, 'P' || substr(replace(v_partner_id::text, '-', ''), 1, 8)));
    INSERT INTO public.partner_codes (partner_id, code_normalized, code_display, status)
    VALUES (v_partner_id, v_code, upper(v_code), 'ACTIVE')
    ON CONFLICT (code_normalized) DO NOTHING;

    RETURN v_partner_id;
  ELSE
    UPDATE public.partner_applications
    SET status = 'REJECTED',
        rejection_reason = COALESCE(p_rejection_reason, 'rejected'),
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_application_id;
    RETURN p_application_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_partner_application(uuid,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid,boolean,text,text) TO authenticated;

-- create partner lead
CREATE OR REPLACE FUNCTION public.create_partner_lead(
  p_contact_name text,
  p_contact_email text,
  p_dedupe_key text,
  p_company text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_code text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_code_id uuid;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT id INTO v_partner_id FROM public.partner_profiles
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  IF p_code IS NOT NULL THEN
    SELECT id INTO v_code_id FROM public.partner_codes
    WHERE partner_id = v_partner_id
      AND code_normalized = public.normalize_partner_code(p_code)
      AND status = 'ACTIVE';
  END IF;

  INSERT INTO public.partner_leads (
    partner_id, partner_code_id, contact_name, contact_email, contact_phone,
    company_name, message, dedupe_key, created_by, attribution_locked_at
  ) VALUES (
    v_partner_id, v_code_id, p_contact_name, lower(trim(p_contact_email)), p_phone,
    p_company, p_message, lower(trim(p_dedupe_key)), auth.uid(), NOW()
  )
  ON CONFLICT (partner_id, dedupe_key) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_lead(text,text,text,text,text,text,text) TO authenticated;

-- review / convert lead (staff)
CREATE OR REPLACE FUNCTION public.review_partner_lead(
  p_lead_id uuid,
  p_status public.partner_lead_status,
  p_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.partner_leads
  SET status = p_status,
      rejected_reason = CASE WHEN p_status = 'REJECTED' THEN p_reason ELSE rejected_reason END,
      updated_at = NOW()
  WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_partner_lead(uuid,public.partner_lead_status,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_partner_lead(uuid,public.partner_lead_status,text) TO authenticated;

-- confirm sale + commission (staff; server authority)
CREATE OR REPLACE FUNCTION public.confirm_partner_sale(
  p_lead_id uuid,
  p_gross_amount_cents bigint,
  p_idempotency_key text,
  p_rate_bps int DEFAULT 1000,
  p_currency text DEFAULT 'EUR',
  p_order_id uuid DEFAULT NULL,
  p_payment_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.partner_leads%ROWTYPE;
  v_sale_id uuid;
  v_comm_id uuid;
  v_amount bigint;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_gross_amount_cents < 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  SELECT * INTO v_lead FROM public.partner_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_amount := (p_gross_amount_cents * p_rate_bps) / 10000;

  INSERT INTO public.partner_sales (
    partner_id, partner_lead_id, order_id, payment_id, status,
    gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at
  ) VALUES (
    v_lead.partner_id, p_lead_id, p_order_id, p_payment_id, 'SETTLED',
    p_gross_amount_cents, p_currency, p_idempotency_key, NOW(), NOW()
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_sale_id;

  UPDATE public.partner_leads
  SET status = 'CONVERTED', converted_sale_id = v_sale_id, updated_at = NOW()
  WHERE id = p_lead_id;

  INSERT INTO public.partner_commissions (
    partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents,
    currency, calculation_rule_version, idempotency_key, approved_at
  ) VALUES (
    v_lead.partner_id, v_sale_id, 'APPROVED', p_gross_amount_cents, p_rate_bps, v_amount,
    p_currency, 'v1_flat_bps', p_idempotency_key || ':commission', NOW()
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_comm_id;

  PERFORM public._partner_post_ledger(
    'COMMISSION_ACCRUAL',
    'partner_commission',
    v_comm_id,
    p_currency,
    p_idempotency_key || ':ledger',
    auth.uid(),
    jsonb_build_array(
      jsonb_build_object('account', 'COMMISSION_LIABILITY', 'partner_id', v_lead.partner_id, 'credit_cents', v_amount, 'debit_cents', 0),
      jsonb_build_object('account', 'REVENUE_CLEARING', 'partner_id', NULL, 'debit_cents', v_amount, 'credit_cents', 0)
    )
  );

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_partner_sale(uuid,bigint,text,int,text,uuid,text) TO authenticated;

-- request payout
CREATE OR REPLACE FUNCTION public.request_partner_payout(
  p_amount_cents bigint,
  p_idempotency_key text,
  p_currency text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_avail bigint;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT id INTO v_partner_id FROM public.partner_profiles
  WHERE user_id = auth.uid() AND status = 'ACTIVE' AND payout_eligible;
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_avail := public.partner_available_liability_cents(v_partner_id);
  IF p_amount_cents <= 0 OR p_amount_cents > v_avail THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  SELECT id INTO v_id
  FROM public.partner_payout_requests
  WHERE idempotency_key = p_idempotency_key;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.partner_payout_requests (
    partner_id, requested_amount_cents, available_amount_snapshot_cents,
    currency, status, idempotency_key
  ) VALUES (
    v_partner_id, p_amount_cents, v_avail, p_currency, 'REQUESTED', p_idempotency_key
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_partner_payout(bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_partner_payout(bigint,text,text) TO authenticated;

-- approve payout + mark paid
CREATE OR REPLACE FUNCTION public.approve_partner_payout_request(
  p_request_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.partner_payout_requests%ROWTYPE;
  v_payout_id uuid;
  v_avail bigint;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_req FROM public.partner_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT p_approve THEN
    UPDATE public.partner_payout_requests
    SET status = 'REJECTED', rejection_reason = COALESCE(p_rejection_reason, 'rejected'),
        reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_request_id;
    RETURN p_request_id;
  END IF;

  v_avail := public.partner_available_liability_cents(v_req.partner_id);
  IF v_req.status = 'REQUESTED' THEN
    v_avail := v_avail + v_req.requested_amount_cents;
  END IF;
  IF v_req.requested_amount_cents > v_avail THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.partner_payout_requests
  SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = auth.uid()
  WHERE id = p_request_id;

  INSERT INTO public.partner_payouts (
    partner_id, payout_request_id, amount_cents, currency, status
  ) VALUES (
    v_req.partner_id, p_request_id, v_req.requested_amount_cents, v_req.currency, 'PENDING'
  )
  ON CONFLICT (payout_request_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_partner_payout_request(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_partner_payout_request(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_partner_payout_paid(
  p_payout_id uuid,
  p_external_reference text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.partner_payouts%ROWTYPE;
  v_key text;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_p FROM public.partner_payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_p.status = 'PAID' THEN RETURN p_payout_id; END IF;

  UPDATE public.partner_payouts
  SET status = 'PAID', paid_at = NOW(), external_reference = p_external_reference, updated_at = NOW()
  WHERE id = p_payout_id;

  -- Commission rows stay APPROVED until fully covered by cumulative PAID payouts (FIFO, whole commissions only)
  WITH paid_total AS (
    SELECT COALESCE(SUM(amount_cents), 0) AS total
    FROM public.partner_payouts
    WHERE partner_id = v_p.partner_id AND status = 'PAID'
  ),
  ordered AS (
    SELECT id, amount_cents,
           SUM(amount_cents) OVER (ORDER BY created_at, id) AS running
    FROM public.partner_commissions
    WHERE partner_id = v_p.partner_id AND status IN ('APPROVED', 'PAID')
  )
  UPDATE public.partner_commissions c
  SET status = 'PAID', paid_at = COALESCE(c.paid_at, NOW()), updated_at = NOW()
  FROM ordered o, paid_total p
  WHERE c.id = o.id
    AND o.running <= p.total
    AND c.status = 'APPROVED';

  v_key := COALESCE(p_idempotency_key, 'payout-paid:' || p_payout_id::text);
  PERFORM public._partner_post_ledger(
    'PAYOUT',
    'partner_payout',
    p_payout_id,
    v_p.currency,
    v_key,
    auth.uid(),
    jsonb_build_array(
      jsonb_build_object('account', 'COMMISSION_LIABILITY', 'partner_id', v_p.partner_id, 'debit_cents', v_p.amount_cents, 'credit_cents', 0),
      jsonb_build_object('account', 'CASH', 'partner_id', NULL, 'credit_cents', v_p.amount_cents, 'debit_cents', 0)
    )
  );

  RETURN p_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_partner_payout_paid(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_partner_payout_paid(uuid,text,text) TO authenticated;

-- cash receipt
CREATE OR REPLACE FUNCTION public.record_partner_cash_receipt(
  p_amount_cents bigint,
  p_idempotency_key text,
  p_partner_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_currency text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  INSERT INTO public.partner_cash_receipts (
    partner_id, amount_cents, currency, evidence_note, actor_user_id, idempotency_key
  ) VALUES (
    p_partner_id, p_amount_cents, p_currency, p_note, auth.uid(), p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET evidence_note = EXCLUDED.evidence_note
  RETURNING id INTO v_id;

  PERFORM public._partner_post_ledger(
    'CASH_RECEIPT',
    'partner_cash_receipt',
    v_id,
    p_currency,
    p_idempotency_key || ':ledger',
    auth.uid(),
    jsonb_build_array(
      jsonb_build_object('account', 'CASH', 'partner_id', NULL, 'debit_cents', p_amount_cents, 'credit_cents', 0),
      jsonb_build_object('account', 'REVENUE_CLEARING', 'partner_id', NULL, 'credit_cents', p_amount_cents, 'debit_cents', 0)
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_partner_cash_receipt(bigint,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_partner_cash_receipt(bigint,text,uuid,text,text) TO authenticated;

-- refund after payout -> compensating adjustment (does not mutate paid payout)
CREATE OR REPLACE FUNCTION public.process_partner_refund_adjustment(
  p_partner_id uuid,
  p_amount_cents bigint,
  p_reason text,
  p_reference_type text,
  p_reference_id uuid,
  p_related_payout_id uuid,
  p_idempotency_key text,
  p_currency text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_amt bigint;
BEGIN
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  v_amt := -abs(p_amount_cents);

  IF p_related_payout_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.partner_payouts WHERE id = p_related_payout_id AND status = 'PAID') THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  INSERT INTO public.partner_adjustments (
    partner_id, amount_cents, currency, reason, reference_type, reference_id,
    related_payout_id, actor_user_id, idempotency_key
  ) VALUES (
    p_partner_id, v_amt, p_currency, p_reason, p_reference_type, p_reference_id,
    p_related_payout_id, auth.uid(), p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET reason = EXCLUDED.reason
  RETURNING id INTO v_id;

  PERFORM public._partner_post_ledger(
    'REFUND_ADJUSTMENT',
    'partner_adjustment',
    v_id,
    p_currency,
    p_idempotency_key || ':ledger',
    auth.uid(),
    jsonb_build_array(
      jsonb_build_object('account', 'COMMISSION_LIABILITY', 'partner_id', p_partner_id, 'debit_cents', abs(v_amt), 'credit_cents', 0),
      jsonb_build_object('account', 'ADJUSTMENT', 'partner_id', p_partner_id, 'credit_cents', abs(v_amt), 'debit_cents', 0)
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_partner_refund_adjustment(uuid,bigint,text,text,uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_partner_refund_adjustment(uuid,bigint,text,text,uuid,uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_financial_summary(p_partner_id uuid DEFAULT NULL)
RETURNS TABLE (
  partner_id uuid,
  available_cents bigint,
  approved_commission_cents bigint,
  paid_payout_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  IF public.is_staff_admin() AND p_partner_id IS NOT NULL THEN
    v_pid := p_partner_id;
  ELSE
    SELECT id INTO v_pid FROM public.partner_profiles WHERE user_id = auth.uid();
  END IF;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  RETURN QUERY
  SELECT
    v_pid,
    public.partner_available_liability_cents(v_pid),
    COALESCE((SELECT SUM(amount_cents) FROM public.partner_commissions WHERE partner_id = v_pid AND status IN ('APPROVED','PAID')), 0),
    COALESCE((SELECT SUM(amount_cents) FROM public.partner_payouts WHERE partner_id = v_pid AND status = 'PAID'), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.partner_financial_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_financial_summary(uuid) TO authenticated;

-- Table privileges: RLS still applies. No INSERT/UPDATE/DELETE for authenticated
-- on financial tables (mutations via SECURITY DEFINER RPCs only).
GRANT SELECT ON public.partner_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_applications TO authenticated;
GRANT SELECT ON public.partner_codes TO authenticated;
GRANT SELECT ON public.partner_leads TO authenticated;
GRANT SELECT ON public.partner_sales TO authenticated;
GRANT SELECT ON public.partner_commissions TO authenticated;
GRANT SELECT ON public.partner_payout_requests TO authenticated;
GRANT SELECT ON public.partner_payouts TO authenticated;
GRANT SELECT ON public.partner_ledger_transactions TO authenticated;
GRANT SELECT ON public.partner_ledger_entries TO authenticated;
GRANT SELECT ON public.partner_cash_receipts TO authenticated;
GRANT SELECT ON public.partner_adjustments TO authenticated;
