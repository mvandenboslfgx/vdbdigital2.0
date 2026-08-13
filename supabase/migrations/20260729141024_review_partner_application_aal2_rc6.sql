-- STATUS: LOCAL + STAGING AUTHORIZED — partner approval AAL2 (rc.6)
-- Contract: vdb-backend-contract@0.2.0-rc.6
-- schemaVersion: 2026.07.29.partner-approval-aal2-rc6
-- Target: staging qzekuvmgfekzsowdecyk ONLY. Production NOT authorized.
--
-- RC6 security amendment:
--   review_partner_application requires server-side AAL2 before any approve/reject
--   mutation. Staff approval alone still never writes ACTIVE.

-- ---------------------------------------------------------------------------
-- 1) review_partner_application — auth → staff → AAL2 → lock → mutate → audit
-- ---------------------------------------------------------------------------
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
  v_uid uuid := auth.uid();
  v_app public.partner_applications%ROWTYPE;
  v_partner_id uuid;
  v_agreement_type public.partner_agreement_type;
  v_agreement_version text;
  v_checklist jsonb;
  v_missing text[];
  v_error text;
BEGIN
  -- 1) auth
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  -- 2) role / capability
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  -- 3) AAL2 before any mutation / success audit
  PERFORM public.require_aal2();

  -- 4) input validation
  IF p_application_id IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
  IF p_approve IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  -- 5) row lock + idempotency (already-terminal states are no-ops)
  SELECT * INTO v_app
  FROM public.partner_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_app.status = 'REJECTED' AND NOT p_approve THEN
    RETURN p_application_id;
  END IF;

  IF v_app.status = 'APPROVED' AND p_approve THEN
    SELECT id INTO v_partner_id FROM public.partner_profiles WHERE user_id = v_app.user_id;
    RETURN COALESCE(v_partner_id, p_application_id);
  END IF;

  IF v_app.status IS DISTINCT FROM 'SUBMITTED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- 6) mutation
  IF NOT p_approve THEN
    UPDATE public.partner_applications
    SET status = 'REJECTED',
        rejection_reason = COALESCE(NULLIF(btrim(COALESCE(p_rejection_reason, '')), ''), 'rejected'),
        reviewed_at = NOW(),
        reviewed_by = v_uid,
        updated_at = NOW()
    WHERE id = p_application_id;

    -- 7) audit
    PERFORM public.portal_write_audit(
      'admin.partner.application.rejected',
      'partner_applications',
      p_application_id::text,
      jsonb_build_object(
        'partner_type', v_app.partner_type::text,
        'schema_version', '2026.07.29.partner-approval-aal2-rc6'
      )
    );

    RETURN p_application_id;
  END IF;

  v_agreement_type := CASE v_app.partner_type
    WHEN 'INDIVIDUAL' THEN 'INDIVIDUAL_PARTNER'::public.partner_agreement_type
    WHEN 'BUSINESS' THEN 'BUSINESS_PARTNER'::public.partner_agreement_type
    ELSE NULL
  END;

  IF v_agreement_type IS NOT NULL THEN
    SELECT av.version INTO v_agreement_version
    FROM public.partner_agreement_versions av
    WHERE av.agreement_type = v_agreement_type AND av.is_current
    LIMIT 1;
  END IF;

  UPDATE public.partner_applications
  SET status = 'APPROVED',
      reviewed_at = NOW(),
      reviewed_by = v_uid,
      staff_approved_at = COALESCE(staff_approved_at, NOW()),
      staff_approved_by = COALESCE(staff_approved_by, v_uid),
      updated_at = NOW()
  WHERE id = p_application_id;

  -- Approval records approval only: status stays PENDING for a new partner.
  -- ACTIVE is reachable exclusively via partner_try_activate.
  INSERT INTO public.partner_profiles (
    user_id, status, legal_name, display_name,
    partner_type, type_classification_status,
    required_agreement_type, required_agreement_version,
    staff_approved_at, staff_approved_by
  ) VALUES (
    v_app.user_id, 'PENDING', v_app.legal_name, COALESCE(v_app.trade_name, v_app.legal_name),
    v_app.partner_type,
    CASE
      WHEN v_app.partner_type IS NULL THEN 'REVIEW_REQUIRED'::public.partner_type_classification_status
      ELSE 'KNOWN'::public.partner_type_classification_status
    END,
    v_agreement_type, v_agreement_version,
    NOW(), v_uid
  )
  ON CONFLICT (user_id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        partner_type = COALESCE(EXCLUDED.partner_type, public.partner_profiles.partner_type),
        type_classification_status = CASE
          WHEN EXCLUDED.partner_type IS NOT NULL THEN 'KNOWN'::public.partner_type_classification_status
          ELSE public.partner_profiles.type_classification_status
        END,
        required_agreement_type = COALESCE(EXCLUDED.required_agreement_type, public.partner_profiles.required_agreement_type),
        required_agreement_version = COALESCE(EXCLUDED.required_agreement_version, public.partner_profiles.required_agreement_version),
        staff_approved_at = COALESCE(public.partner_profiles.staff_approved_at, EXCLUDED.staff_approved_at),
        staff_approved_by = COALESCE(public.partner_profiles.staff_approved_by, EXCLUDED.staff_approved_by),
        updated_at = NOW()
  RETURNING id INTO v_partner_id;

  IF v_partner_id IS NULL THEN
    SELECT id INTO v_partner_id FROM public.partner_profiles WHERE user_id = v_app.user_id;
  END IF;

  -- 7) audit
  PERFORM public.portal_write_audit(
    'admin.partner.application.approved',
    'partner_applications',
    p_application_id::text,
    jsonb_build_object(
      'partner_id', v_partner_id,
      'partner_type', v_app.partner_type::text,
      'activatesImmediately', false,
      'schema_version', '2026.07.29.partner-approval-aal2-rc6'
    )
  );

  -- 8) activation checklist (soft). Denied activation must NOT roll back approval.
  BEGIN
    PERFORM public.partner_try_activate(v_partner_id, p_partner_code);
  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    IF v_error NOT LIKE 'ACTIVATION_DENIED%' THEN
      RAISE;
    END IF;

    v_checklist := public.partner_activation_checklist(v_partner_id);
    SELECT COALESCE(array_agg(m.code ORDER BY m.ord), '{}'::text[])
    INTO v_missing
    FROM jsonb_array_elements_text(v_checklist -> 'missing') WITH ORDINALITY AS m(code, ord);

    UPDATE public.partner_profiles
    SET activation_block_codes = v_missing,
        updated_at = NOW()
    WHERE id = v_partner_id;

    PERFORM public.portal_write_audit(
      'admin.partner.activation_deferred',
      'partner_profiles',
      v_partner_id::text,
      jsonb_build_object(
        'missing', to_jsonb(v_missing),
        'error', v_error,
        'schema_version', '2026.07.29.partner-approval-aal2-rc6'
      )
    );
  END;

  RETURN v_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_partner_application(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_partner_application(uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid, boolean, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.review_partner_application(uuid, boolean, text, text) IS
  'rc.6 — staff review requires AAL2. Approval records staff_approved_at/by and then attempts activation; if the checklist is incomplete the approval is still committed, the partner stays PENDING and activation_block_codes explains why. Returns the partner id on approve, the application id on reject.';

-- ---------------------------------------------------------------------------
-- 2) admin_get_security_status — RC6 schema stamp (shape unchanged)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_security_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_aal text := COALESCE(auth.jwt() ->> 'aal', 'aal1');
  v_role text;
  v_mfa boolean := false;
  v_capabilities jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT ar.role::text INTO v_role
  FROM public.admin_roles ar
  WHERE ar.user_id = v_uid;

  IF to_regclass('auth.mfa_factors') IS NOT NULL THEN
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM auth.mfa_factors f
        WHERE f.user_id = v_uid AND f.status = 'verified'
      ) INTO v_mfa;
    EXCEPTION WHEN OTHERS THEN
      v_mfa := false;
    END;
  END IF;

  IF v_role IN ('OWNER', 'ADMIN') THEN
    v_capabilities := jsonb_build_array(
      'dashboard.read',
      'work_queue.read',
      'directory.read',
      'settings.read',
      'security.read',
      'commission.approve',
      'commission.reject',
      'partner.suspend',
      'partner.reactivate'
    );
  ELSE
    v_capabilities := jsonb_build_array(
      'dashboard.read',
      'work_queue.read',
      'directory.read',
      'settings.read',
      'security.read'
    );
  END IF;

  RETURN jsonb_build_object(
    'current_aal', v_aal,
    'mfa_enrolled', v_mfa,
    'mfa_required', true,
    'step_up_required', v_aal IS DISTINCT FROM 'aal2',
    'actor_role', v_role,
    'capabilities', v_capabilities,
    'schema_version', '2026.07.29.partner-approval-aal2-rc6',
    'generated_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_security_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_security_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_security_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_security_status() IS
  'rc.6 — unchanged shape with schema_version bumped to 2026.07.29.partner-approval-aal2-rc6. Still returns booleans and capability names only.';

-- ---------------------------------------------------------------------------
-- 3) verify_partner_approval_aal2_rc6_contracts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_partner_approval_aal2_rc6_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('review_overload_count',
      (SELECT count(*) = 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'review_partner_application'),
      'single public overload'),
    ('review_requires_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'review_partner_application'
          AND p.prosrc LIKE '%require_aal2%'
      ),
      'require_aal2 present in body'),
    ('review_aal2_before_update',
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'review_partner_application'
          AND position('require_aal2' in p.prosrc)
            < position('UPDATE public.partner_applications' in p.prosrc)
      ),
      'AAL2 gate precedes mutation'),
    ('review_no_anon_execute',
      NOT has_function_privilege('anon', 'public.review_partner_application(uuid,boolean,text,text)', 'EXECUTE'),
      'anon execute revoked'),
    ('review_authenticated_execute',
      has_function_privilege('authenticated', 'public.review_partner_application(uuid,boolean,text,text)', 'EXECUTE'),
      'authenticated execute granted'),
    ('schema_version:admin_get_security_status',
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'admin_get_security_status'
          AND p.prosrc LIKE '%2026.07.29.partner-approval-aal2-rc6%'
      ),
      'rc.6 security stamp'),
    ('sibling:approve_partner_commission_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'approve_partner_commission'
          AND p.prosrc LIKE '%require_aal2%'
      ), 'ok'),
    ('sibling:reject_partner_commission_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'reject_partner_commission'
          AND p.prosrc LIKE '%require_aal2%'
      ), 'ok'),
    ('sibling:suspend_partner_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'suspend_partner'
          AND p.prosrc LIKE '%require_aal2%'
      ), 'ok'),
    ('sibling:reactivate_partner_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'reactivate_partner'
          AND p.prosrc LIKE '%require_aal2%'
      ), 'ok'),
    ('sibling:activate_partner_profile_aal2',
      EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'activate_partner_profile'
          AND p.prosrc LIKE '%require_aal2%'
      ), 'ok')
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_partner_approval_aal2_rc6_contracts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_partner_approval_aal2_rc6_contracts() FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_partner_approval_aal2_rc6_contracts()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_partner_approval_aal2_rc6_contracts() IS
  'rc.6 — presence/order checks for AAL2 on review_partner_application plus sibling privileged RPC AAL2 audit.';
