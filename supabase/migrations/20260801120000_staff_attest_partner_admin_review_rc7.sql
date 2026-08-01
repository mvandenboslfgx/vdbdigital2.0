-- STATUS: LOCAL AUTHORIZED ONLY — partner administrative review attestation (rc.7)
-- Contract: vdb-backend-contract@0.2.0-rc.7
-- schemaVersion (read stamps unchanged): 2026.07.29.partner-approval-aal2-rc6
-- Contract package: vdb-backend-contract@0.2.0-rc.7
-- Target: local / staging qzekuvmgfekzsowdecyk ONLY. Production NOT authorized.
--
-- B1 (Fase 2): productive staff RPC for administrative partner review.
-- Reinterprets identity_verification_status for Partners v1 as administrative
-- partnercontrole — NOT automatic ID-check, KYC provider, document, camera,
-- selfie, liveness, BSN, or biometrics.
-- Does NOT change AGE / BUSINESS / AGREEMENT / PAYOUT / STAFF_APPROVAL gates.
-- Does NOT rewrite existing rows, ACTIVE partners, or grandfathering.
-- Does NOT enable partner_compliance_fixtures or replace the staging fixture RPC.

-- ---------------------------------------------------------------------------
-- 1) Column semantics (comments only — no data rewrite)
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.partner_profiles.identity_verification_status IS
  'v1 (rc.7): administrative partner review status. VERIFIED means bevoegd VDB-personeel completed administrative partnercontrole — NOT document/biometric/external IDV. Fail-closed activation gate IDENTITY_NOT_VERIFIED remains.';

COMMENT ON COLUMN public.partner_profiles.identity_verified_at IS
  'v1 (rc.7): timestamp when administrative partner review reached VERIFIED. Not proof of ID-document check.';

COMMENT ON COLUMN public.partner_profiles.identity_verification_provider_ref IS
  'Opaque provider reference for future optional IDV only. staff_attest_partner_admin_review never writes this. Never store document contents or numbers.';

-- ---------------------------------------------------------------------------
-- 2) staff_attest_partner_admin_review — auth → staff → AAL2 → rate limit → mutate → audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_attest_partner_admin_review(
  p_partner_id uuid,
  p_outcome text,
  p_reason_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_outcome text := upper(btrim(COALESCE(p_outcome, '')));
  v_reason text := upper(btrim(COALESCE(p_reason_code, '')));
  v_allowed_outcomes text[] := ARRAY[
    'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'NOT_STARTED'
  ];
  v_allowed_reasons text[] := ARRAY[
    'PROFILE_DATA_REVIEWED',
    'CORRECTION_REQUIRED',
    'DATA_INCONSISTENT',
    'DUPLICATE_ACCOUNT_REVIEW',
    'MANUAL_REVIEW_REQUIRED',
    'ADMINISTRATIVE_REVIEW_REJECTED'
  ];
  v_p public.partner_profiles%ROWTYPE;
  v_prev text;
  v_rate record;
  v_changed boolean := false;
  v_checklist jsonb;
BEGIN
  -- 1) auth
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  -- 2) role
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  -- 3) AAL2 before mutation / audit
  PERFORM public.require_aal2();

  -- 4) input allowlists (no free-form status / reason / PII)
  IF p_partner_id IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
  IF NOT (v_outcome = ANY (v_allowed_outcomes)) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF NOT (v_reason = ANY (v_allowed_reasons)) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  -- Outcome ↔ reason coherence (administrative only; not legal fraud taxonomy)
  IF v_outcome = 'VERIFIED' AND v_reason IS DISTINCT FROM 'PROFILE_DATA_REVIEWED' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF v_outcome = 'REJECTED' AND v_reason IS DISTINCT FROM 'ADMINISTRATIVE_REVIEW_REJECTED' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF v_outcome = 'MANUAL_REVIEW' AND v_reason NOT IN (
    'CORRECTION_REQUIRED', 'DATA_INCONSISTENT',
    'DUPLICATE_ACCOUNT_REVIEW', 'MANUAL_REVIEW_REQUIRED'
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  IF v_outcome = 'NOT_STARTED' AND v_reason IS DISTINCT FROM 'CORRECTION_REQUIRED' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  -- 5) rate limit (SECURITY DEFINER owner; service_role-gated helper)
  SELECT * INTO v_rate
  FROM public.check_rate_limit(
    'staff_attest_partner_admin_review:' || v_uid::text,
    30,
    60
  );
  IF NOT COALESCE(v_rate.allowed, false) THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  -- 6) lock partner row
  SELECT * INTO v_p
  FROM public.partner_profiles
  WHERE id = p_partner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_prev := v_p.identity_verification_status::text;

  -- 7) idempotent no-op: identical outcome → no audit, no write
  IF v_prev = v_outcome THEN
    v_checklist := public.partner_activation_checklist(p_partner_id);
    RETURN jsonb_build_object(
      'id', v_p.id,
      'identity_verification_status', v_p.identity_verification_status::text,
      'identity_verified_at', v_p.identity_verified_at,
      'identity_verification_provider_ref', v_p.identity_verification_provider_ref,
      'changed', false,
      'reason_code', v_reason,
      'payout_eligible', v_p.payout_eligible,
      'status', v_p.status::text,
      'activation_missing', COALESCE(v_checklist -> 'missing', '[]'::jsonb),
      'schema_version', '2026.07.29.partner-approval-aal2-rc6',
      'contract_package', 'vdb-backend-contract@0.2.0-rc.7',
      'semantics', 'administrative_partner_review_v1'
    );
  END IF;

  -- 8) mutate identity administrative review fields only
  UPDATE public.partner_profiles
  SET identity_verification_status = v_outcome::public.partner_verification_status,
      identity_verified_at = CASE
        WHEN v_outcome = 'VERIFIED' THEN NOW()
        ELSE NULL
      END,
      -- Never populate provider_ref for administrative review
      identity_verification_provider_ref = identity_verification_provider_ref,
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING * INTO v_p;

  v_changed := true;

  -- 9) audit exactly once per actual status change (no free-text PII)
  PERFORM public.portal_write_audit(
    'admin.partner.admin_review.attested',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previous_status', v_prev,
      'new_status', v_outcome,
      'reason_code', v_reason,
      'semantics', 'administrative_partner_review_v1',
      'provider_ref_touched', false,
      'contract_package', 'vdb-backend-contract@0.2.0-rc.7',
      'schema_version', '2026.07.29.partner-approval-aal2-rc6'
    )
  );

  v_checklist := public.partner_activation_checklist(p_partner_id);

  RETURN jsonb_build_object(
    'id', v_p.id,
    'identity_verification_status', v_p.identity_verification_status::text,
    'identity_verified_at', v_p.identity_verified_at,
    'identity_verification_provider_ref', v_p.identity_verification_provider_ref,
    'changed', v_changed,
    'reason_code', v_reason,
    'payout_eligible', v_p.payout_eligible,
    'status', v_p.status::text,
    'activation_missing', COALESCE(v_checklist -> 'missing', '[]'::jsonb),
    'schema_version', '2026.07.29.partner-approval-aal2-rc6',
    'contract_package', 'vdb-backend-contract@0.2.0-rc.7',
    'semantics', 'administrative_partner_review_v1'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_attest_partner_admin_review(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_attest_partner_admin_review(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_attest_partner_admin_review(uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.staff_attest_partner_admin_review(uuid, text, text) IS
  'rc.7 — staff + AAL2 administrative partner review attestation. Sets identity_verification_status only. VERIFIED means administrative partnercontrole afgerond — NOT ID-document/biometric/external IDV. Never writes provider_ref. Never activates. Never touches age/business/agreement/payout. Idempotent: identical outcome skips audit.';

-- ---------------------------------------------------------------------------
-- 3) Verifier (presence / hardening / semantics)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_partner_admin_review_rc7_contracts()
RETURNS TABLE (check_name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    (
      'fn:staff_attest_partner_admin_review'::text,
      to_regprocedure('public.staff_attest_partner_admin_review(uuid,text,text)') IS NOT NULL,
      'RPC present'::text
    ),
    (
      'fn:staff_attest.require_aal2'::text,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'staff_attest_partner_admin_review'
          AND p.prosrc LIKE '%require_aal2%'
      ),
      'require_aal2 in body'::text
    ),
    (
      'fn:staff_attest.rate_limit'::text,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'staff_attest_partner_admin_review'
          AND p.prosrc LIKE '%check_rate_limit%'
      ),
      'check_rate_limit in body'::text
    ),
    (
      'fn:staff_attest.no_provider_ref_write'::text,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'staff_attest_partner_admin_review'
          AND p.prosrc LIKE '%provider_ref_touched%, false%'
          AND p.prosrc NOT LIKE '%identity_verification_provider_ref = %p_%'
      ),
      'provider_ref never set from params'::text
    ),
    (
      'fn:staff_attest.grants'::text,
      NOT has_function_privilege('anon', 'public.staff_attest_partner_admin_review(uuid,text,text)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.staff_attest_partner_admin_review(uuid,text,text)', 'EXECUTE'),
      'anon denied; authenticated granted'::text
    ),
    (
      'fn:fixture_untouched'::text,
      to_regprocedure('public.staff_set_partner_compliance_fixture(uuid,text,text,text,text)') IS NOT NULL,
      'staging fixture RPC still present'::text
    ),
    (
      'gate:identity_still_in_checklist'::text,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'partner_activation_checklist'
          AND p.prosrc LIKE '%IDENTITY_NOT_VERIFIED%'
          AND p.prosrc LIKE '%identity_verification_status = ''VERIFIED''%'
      ),
      'IDENTITY_NOT_VERIFIED gate retained'::text
    ),
    (
      'gate:age_untouched'::text,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'partner_activation_checklist'
          AND p.prosrc LIKE '%AGE_NOT_VERIFIED%'
      ),
      'AGE_NOT_VERIFIED gate retained'::text
    )
  ) AS t(check_name, ok, detail);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_partner_admin_review_rc7_contracts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_partner_admin_review_rc7_contracts() FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_partner_admin_review_rc7_contracts()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_partner_admin_review_rc7_contracts() IS
  'rc.7 — presence/hardening checks for staff_attest_partner_admin_review; proves identity gate and age gate remain.';
