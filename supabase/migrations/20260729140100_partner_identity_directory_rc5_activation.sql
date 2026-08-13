-- STATUS: LOCAL ONLY — partner activation gate rc.5
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
-- Target: staging only after local verify. Production NOT authorized.
--
-- Depends on 20260729140000 (enums, columns, agreement tables, flags).
--
-- Activation policy for this file:
--   * partner_activation_checklist is the single source of truth for
--     "may this partner become ACTIVE?".
--   * Staff approval alone NEVER activates a partner and NEVER grants payouts.
--   * APPROVED payout_profile_status is required for can_activate (and thus ACTIVE).
--   * payout_eligible may only become true while payout_profile_status = 'APPROVED'.
--   * compliance_status is only set to 'OK' by a successful activation.
--   * No payout request / approval / payment RPC is created or relaxed here.

-- ---------------------------------------------------------------------------
-- 1) KvK format helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_is_valid_kvk(p_kvk text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(btrim(p_kvk), '') ~ '^\d{8}$';
$$;

REVOKE ALL ON FUNCTION public.partner_is_valid_kvk(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_is_valid_kvk(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.partner_is_valid_kvk(text) IS
  'rc.5 — format-only check: TRUE iff the trimmed value is exactly 8 digits. NULL/empty is FALSE; optionality is decided by the caller (BUSINESS requires a valid KvK, INDIVIDUAL must not supply one).';

-- ---------------------------------------------------------------------------
-- 2) partner_activation_checklist — fixed-shape activation readiness report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_activation_checklist(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p public.partner_profiles%ROWTYPE;
  v_app public.partner_applications%ROWTYPE;
  v_type public.partner_type;
  v_agreement_type public.partner_agreement_type;
  v_legal_name text;
  v_kvk text;
  v_missing text[] := '{}'::text[];
  v_type_known boolean;
  v_staff_approved boolean;
  v_age_ok boolean;
  v_identity_ok boolean;
  v_business_ok boolean;
  v_company_ok boolean;
  v_agreement_ok boolean;
  v_payout_ok boolean;
  v_not_suspended boolean;
  v_can boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_p FROM public.partner_profiles WHERE id = p_partner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  -- Staff, or the partner reading their own checklist. Internal callers are
  -- SECURITY DEFINER RPCs that are themselves staff-gated.
  IF NOT public.is_staff_admin() AND v_p.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Latest application for this user supplies company details for BUSINESS.
  SELECT * INTO v_app
  FROM public.partner_applications a
  WHERE a.user_id = v_p.user_id
  ORDER BY COALESCE(a.submitted_at, a.created_at) DESC, a.created_at DESC
  LIMIT 1;

  v_type := COALESCE(v_p.partner_type, v_app.partner_type);
  v_agreement_type := CASE v_type
    WHEN 'INDIVIDUAL' THEN 'INDIVIDUAL_PARTNER'::public.partner_agreement_type
    WHEN 'BUSINESS' THEN 'BUSINESS_PARTNER'::public.partner_agreement_type
    ELSE NULL
  END;

  v_legal_name := NULLIF(btrim(COALESCE(v_p.legal_name, v_app.legal_name, '')), '');
  v_kvk := NULLIF(btrim(COALESCE(v_app.kvk_number, '')), '');

  -- 1. Type must be positively classified. Legacy rows sit on REVIEW_REQUIRED.
  v_type_known := v_type IS NOT NULL
    AND v_p.type_classification_status = 'KNOWN';

  -- 2. Staff approval on the profile or on an APPROVED application.
  v_staff_approved := v_p.staff_approved_at IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.partner_applications a
      WHERE a.user_id = v_p.user_id
        AND a.status = 'APPROVED'
        AND a.staff_approved_at IS NOT NULL
    );

  -- 3. 18+ gate; an expired verification does not count.
  v_age_ok := v_p.age_verification_status = 'VERIFIED'
    AND (v_p.age_verification_expires_at IS NULL OR v_p.age_verification_expires_at > NOW());

  -- 4. Identity gate.
  v_identity_ok := v_p.identity_verification_status = 'VERIFIED';

  -- 5. Business gate. INDIVIDUAL partners are not asked for company data and a
  --    KvK number is never required from them.
  IF v_type = 'BUSINESS' THEN
    v_company_ok := v_legal_name IS NOT NULL AND public.partner_is_valid_kvk(v_kvk);
    v_business_ok := v_p.business_verification_status = 'VERIFIED';
  ELSE
    v_company_ok := true;
    v_business_ok := true;
  END IF;

  -- 6. Current agreement of the required family must be accepted.
  IF v_agreement_type IS NULL THEN
    v_agreement_ok := false;
  ELSE
    v_agreement_ok := EXISTS (
      SELECT 1
      FROM public.partner_agreement_acceptances acc
      JOIN public.partner_agreement_versions av ON av.id = acc.agreement_version_id
      WHERE acc.partner_id = v_p.id
        AND av.agreement_type = v_agreement_type
        AND av.is_current
    );
  END IF;

  -- 7. Payout profile APPROVED is required before ACTIVE (gate rule).
  --    payout_eligible remains tied to the same APPROVED status at activation time.
  v_payout_ok := v_p.payout_profile_status = 'APPROVED';

  -- 8. Suspended/revoked partners are not activated by this path.
  v_not_suspended := v_p.status NOT IN ('SUSPENDED', 'REVOKED');

  -- The ::text casts are load-bearing: an untyped literal makes Postgres pick
  -- anyarray || anyarray and try to parse the code as an array literal.
  IF NOT v_type_known THEN v_missing := v_missing || 'PARTNER_TYPE_UNKNOWN'::text; END IF;
  IF NOT v_not_suspended THEN v_missing := v_missing || 'PARTNER_SUSPENDED'::text; END IF;
  IF NOT v_staff_approved THEN v_missing := v_missing || 'STAFF_APPROVAL_MISSING'::text; END IF;
  IF NOT v_age_ok THEN v_missing := v_missing || 'AGE_NOT_VERIFIED'::text; END IF;
  IF NOT v_identity_ok THEN v_missing := v_missing || 'IDENTITY_NOT_VERIFIED'::text; END IF;
  IF NOT v_business_ok THEN v_missing := v_missing || 'BUSINESS_NOT_VERIFIED'::text; END IF;
  IF NOT v_company_ok THEN v_missing := v_missing || 'COMPANY_DETAILS_MISSING'::text; END IF;
  IF NOT v_agreement_ok THEN v_missing := v_missing || 'AGREEMENT_NOT_ACCEPTED'::text; END IF;
  IF NOT v_payout_ok THEN v_missing := v_missing || 'PAYOUT_PROFILE_NOT_APPROVED'::text; END IF;

  v_can := array_length(v_missing, 1) IS NULL;

  RETURN jsonb_build_object(
    'schema_version', '2026.07.29.partner-identity-directory-rc5',
    'partner_id', v_p.id,
    'partner_type', v_type::text,
    'profile_status', v_p.status::text,
    'can_activate', v_can,
    'missing', to_jsonb(v_missing),
    'checks', jsonb_build_object(
      'partner_type_known', v_type_known,
      'staff_approved', v_staff_approved,
      'age_verified', v_age_ok,
      'identity_verified', v_identity_ok,
      'business_verified_or_na', v_business_ok AND v_company_ok,
      'agreement_accepted_current', v_agreement_ok,
      'payout_profile_approved', v_payout_ok,
      'not_suspended', v_not_suspended
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.partner_activation_checklist(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_activation_checklist(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.partner_activation_checklist(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.partner_activation_checklist(uuid) IS
  'rc.5 — fixed-shape activation readiness. can_activate requires type, staff approval, age, identity, type-bound business/KVK, current agreement, approved payout profile, and not suspended.';

-- ---------------------------------------------------------------------------
-- 3) partner_try_activate — the only writer of an ACTIVE partner profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_try_activate(
  p_partner_id uuid,
  p_partner_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p public.partner_profiles%ROWTYPE;
  v_checklist jsonb;
  v_missing text[];
  v_payout_eligible boolean;
  v_code text;
  v_code_display text;
  v_updated timestamptz;
  v_audit_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_p
  FROM public.partner_profiles
  WHERE id = p_partner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_checklist := public.partner_activation_checklist(p_partner_id);

  IF NOT COALESCE((v_checklist ->> 'can_activate')::boolean, false) THEN
    SELECT COALESCE(array_agg(m.code ORDER BY m.ord), '{}'::text[])
    INTO v_missing
    FROM jsonb_array_elements_text(v_checklist -> 'missing') WITH ORDINALITY AS m(code, ord);

    -- Diagnostic write. NOTE: the RAISE below aborts this (sub)transaction, so
    -- callers that want the codes persisted must re-apply them after catching
    -- ACTIVATION_DENIED (see review_partner_application).
    UPDATE public.partner_profiles
    SET activation_block_codes = v_missing,
        updated_at = NOW()
    WHERE id = p_partner_id;

    RAISE EXCEPTION '%', 'ACTIVATION_DENIED:' || COALESCE(v_missing[1], 'UNKNOWN');
  END IF;

  -- Payout eligibility is never inferred from activation itself.
  v_payout_eligible := (v_p.payout_profile_status = 'APPROVED');

  UPDATE public.partner_profiles
  SET status = 'ACTIVE',
      payout_eligible = v_payout_eligible,
      compliance_status = 'OK',
      activation_block_codes = '{}'::text[],
      suspended_at = NULL,
      revoked_at = NULL,
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING updated_at INTO v_updated;

  -- Referral code: created once, never rotated by activation.
  SELECT pc.code_display INTO v_code_display
  FROM public.partner_codes pc
  WHERE pc.partner_id = p_partner_id AND pc.status = 'ACTIVE'
  ORDER BY pc.created_at ASC
  LIMIT 1;

  IF v_code_display IS NULL THEN
    v_code := public.normalize_partner_code(
      COALESCE(
        NULLIF(btrim(COALESCE(p_partner_code, '')), ''),
        'P' || substr(replace(p_partner_id::text, '-', ''), 1, 8)
      )
    );
    INSERT INTO public.partner_codes (partner_id, code_normalized, code_display, status)
    VALUES (p_partner_id, v_code, upper(v_code), 'ACTIVE')
    ON CONFLICT (code_normalized) DO NOTHING;

    SELECT pc.code_display INTO v_code_display
    FROM public.partner_codes pc
    WHERE pc.partner_id = p_partner_id AND pc.status = 'ACTIVE'
    ORDER BY pc.created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner.activated',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previousStatus', v_p.status::text,
      'newStatus', 'ACTIVE',
      'partnerType', v_checklist ->> 'partner_type',
      'payoutEligible', v_payout_eligible,
      'payoutProfileStatus', v_p.payout_profile_status::text,
      'legacyGrandfathered', v_p.legacy_activation_grandfathered,
      'checks', v_checklist -> 'checks'
    )
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'id', p_partner_id,
    'previous_status', v_p.status::text,
    'status', 'active',
    'payout_eligible', v_payout_eligible,
    'partner_code', v_code_display,
    'updated_at', v_updated,
    'audit_id', v_audit_id,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.partner_try_activate(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_try_activate(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.partner_try_activate(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.partner_try_activate(uuid, text) IS
  'rc.5 — staff-gated activation attempt. Activates only when partner_activation_checklist.can_activate is true; otherwise raises ACTIVATION_DENIED:<first missing code>. Sets payout_eligible only when payout_profile_status = APPROVED.';

-- ---------------------------------------------------------------------------
-- 4) submit_partner_application — typed intake (signature change)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_partner_application(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_partner_application(
  p_partner_type text,
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
  v_uid uuid := auth.uid();
  v_type_text text := upper(btrim(COALESCE(p_partner_type, '')));
  v_type public.partner_type;
  v_agreement_type public.partner_agreement_type;
  v_agreement_version text;
  v_legal_name text := btrim(COALESCE(p_legal_name, ''));
  v_trade_name text := NULLIF(btrim(COALESCE(p_trade_name, '')), '');
  v_email text := lower(btrim(COALESCE(p_contact_email, '')));
  v_kvk text := NULLIF(btrim(COALESCE(p_kvk, '')), '');
  v_vat text := NULLIF(btrim(COALESCE(p_vat, '')), '');
  v_phone text := NULLIF(btrim(COALESCE(p_phone, '')), '');
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  IF v_type_text NOT IN ('INDIVIDUAL', 'BUSINESS') THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;
  v_type := v_type_text::public.partner_type;

  IF v_legal_name = '' OR v_email = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF v_type = 'INDIVIDUAL' THEN
    -- A particulier must not submit a KvK number: it would silently turn the
    -- application into a business identity.
    IF v_kvk IS NOT NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  ELSE
    IF COALESCE(v_trade_name, v_legal_name) IS NULL OR btrim(COALESCE(v_trade_name, v_legal_name)) = '' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
    IF NOT public.partner_is_valid_kvk(v_kvk) THEN
      RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;
  END IF;

  v_agreement_type := CASE v_type
    WHEN 'INDIVIDUAL' THEN 'INDIVIDUAL_PARTNER'::public.partner_agreement_type
    ELSE 'BUSINESS_PARTNER'::public.partner_agreement_type
  END;

  SELECT av.version INTO v_agreement_version
  FROM public.partner_agreement_versions av
  WHERE av.agreement_type = v_agreement_type AND av.is_current
  LIMIT 1;

  SELECT id INTO v_id
  FROM public.partner_applications
  WHERE user_id = v_uid
    AND status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    UPDATE public.partner_applications
    SET status = 'SUBMITTED',
        partner_type = v_type,
        legal_name = v_legal_name,
        trade_name = v_trade_name,
        contact_email = v_email,
        kvk_number = v_kvk,
        vat_number = v_vat,
        contact_phone = v_phone,
        submitted_at = COALESCE(submitted_at, NOW()),
        updated_at = NOW(),
        version = version + 1
    WHERE id = v_id;
  ELSE
    INSERT INTO public.partner_applications (
      user_id, status, partner_type, legal_name, trade_name, contact_email,
      kvk_number, vat_number, contact_phone, submitted_at
    ) VALUES (
      v_uid, 'SUBMITTED', v_type, v_legal_name, v_trade_name, v_email,
      v_kvk, v_vat, v_phone, NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  -- Profile stays PENDING. Activation is never a side effect of submitting.
  INSERT INTO public.partner_profiles (
    user_id, status, legal_name, display_name,
    partner_type, type_classification_status,
    required_agreement_type, required_agreement_version
  ) VALUES (
    v_uid, 'PENDING', v_legal_name, COALESCE(v_trade_name, v_legal_name),
    v_type, 'KNOWN',
    v_agreement_type, v_agreement_version
  )
  ON CONFLICT (user_id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        partner_type = EXCLUDED.partner_type,
        type_classification_status = 'KNOWN',
        required_agreement_type = EXCLUDED.required_agreement_type,
        required_agreement_version = EXCLUDED.required_agreement_version,
        updated_at = NOW()
  WHERE public.partner_profiles.status = 'PENDING';

  -- Audit carries no PII: type and application id only.
  PERFORM public.portal_write_audit(
    'portal.partner.application.submit',
    'partner_applications',
    v_id::text,
    jsonb_build_object('partner_type', v_type::text, 'application_id', v_id)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text) IS
  'rc.5 — typed partner intake. INDIVIDUAL may not supply a KvK; BUSINESS requires a company name and an 8-digit KvK. Leaves the profile PENDING and never sets ACTIVE.';

-- ---------------------------------------------------------------------------
-- 5) review_partner_application — approval records approval, nothing more
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_app FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT p_approve THEN
    UPDATE public.partner_applications
    SET status = 'REJECTED',
        rejection_reason = COALESCE(p_rejection_reason, 'rejected'),
        reviewed_at = NOW(),
        reviewed_by = v_uid,
        updated_at = NOW()
    WHERE id = p_application_id;

    PERFORM public.portal_write_audit(
      'admin.partner.application.rejected',
      'partner_applications',
      p_application_id::text,
      jsonb_build_object('partner_type', v_app.partner_type::text)
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

  -- Approval records approval only: status stays whatever it was (PENDING for
  -- a new partner). ACTIVE is reachable exclusively via partner_try_activate.
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

  PERFORM public.portal_write_audit(
    'admin.partner.application.approved',
    'partner_applications',
    p_application_id::text,
    jsonb_build_object(
      'partner_id', v_partner_id,
      'partner_type', v_app.partner_type::text,
      'activatesImmediately', false
    )
  );

  -- Soft activation attempt. A denied activation must NOT roll back the staff
  -- approval, so the failure is caught and the blocking codes are re-applied
  -- (the inner subtransaction rollback discarded the ones try_activate wrote).
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
      jsonb_build_object('missing', to_jsonb(v_missing), 'error', v_error)
    );
  END;

  RETURN v_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_partner_application(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_partner_application(uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid, boolean, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.review_partner_application(uuid, boolean, text, text) IS
  'rc.5 — staff review. Approval records staff_approved_at/by and then attempts activation; if the checklist is incomplete the approval is still committed, the partner stays PENDING and activation_block_codes explains why. Returns the partner id on approve, the application id on reject.';

-- ---------------------------------------------------------------------------
-- 6) activate_partner_profile — OWNER/ADMIN + AAL2 + reason + idempotency
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_partner_profile(
  p_partner_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_partner_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_partner public.partner_profiles%ROWTYPE;
  v_result jsonb;
  v_audit_id uuid;
  v_response jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'activate_partner_profile');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_partner_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE id = p_partner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  -- Conflict of interest: an operator may never activate their own partner.
  IF v_partner.user_id IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_partner.status = 'ACTIVE' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- Raises ACTIVATION_DENIED:<code> when the checklist is incomplete.
  v_result := public.partner_try_activate(p_partner_id, p_partner_code);

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner.activation_authorized',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previousStatus', v_partner.status::text,
      'newStatus', 'ACTIVE',
      'payoutEligible', COALESCE((v_result ->> 'payout_eligible')::boolean, false),
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := v_result || jsonb_build_object('authorization_audit_id', v_audit_id);

  PERFORM public.admin_idempotency_put(
    v_key, 'activate_partner_profile', v_uid, 'partner_profiles', p_partner_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_partner_profile(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_partner_profile(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_partner_profile(uuid, text, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.activate_partner_profile(uuid, text, text, text) IS
  'rc.5 — OWNER/ADMIN + AAL2 activation with reason and idempotency. Delegates to partner_try_activate: an incomplete checklist raises ACTIVATION_DENIED and nothing is written.';

-- ---------------------------------------------------------------------------
-- 7) accept_partner_agreement — partner accepts the current version
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_partner_agreement(p_agreement_version_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner public.partner_profiles%ROWTYPE;
  v_version public.partner_agreement_versions%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE user_id = v_uid
    AND status IN ('PENDING', 'ACTIVE', 'SUSPENDED');
  IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_version
  FROM public.partner_agreement_versions
  WHERE id = p_agreement_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  -- Only the current version can be accepted; superseded drafts are read-only.
  IF NOT v_version.is_current THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  INSERT INTO public.partner_agreement_acceptances (
    partner_id, agreement_version_id, agreement_type, agreement_version,
    accepted_by_user_id, integrity_hash
  ) VALUES (
    v_partner.id, v_version.id, v_version.agreement_type, v_version.version,
    v_uid,
    md5(v_version.agreement_type::text || ':' || v_version.version || ':' || v_version.body_placeholder)
  )
  ON CONFLICT ON CONSTRAINT partner_agreement_acceptances_partner_version_unique DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.partner_agreement_acceptances
    WHERE partner_id = v_partner.id AND agreement_version_id = v_version.id;
  END IF;

  PERFORM public.portal_write_audit(
    'portal.partner.agreement.accepted',
    'partner_agreement_acceptances',
    v_id::text,
    jsonb_build_object(
      'partner_id', v_partner.id,
      'agreement_type', v_version.agreement_type::text,
      'agreement_version', v_version.version
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_partner_agreement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_partner_agreement(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_partner_agreement(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.accept_partner_agreement(uuid) IS
  'rc.5 — the calling partner accepts one current agreement version. Idempotent per (partner, version). Bodies are placeholders pending legal review.';

-- ---------------------------------------------------------------------------
-- 8) staff_set_partner_compliance_fixture — staging synthetic data only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_set_partner_compliance_fixture(
  p_partner_id uuid,
  p_age_status text DEFAULT NULL,
  p_identity_status text DEFAULT NULL,
  p_business_status text DEFAULT NULL,
  p_payout_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_age text := NULLIF(upper(btrim(COALESCE(p_age_status, ''))), '');
  v_identity text := NULLIF(upper(btrim(COALESCE(p_identity_status, ''))), '');
  v_business text := NULLIF(upper(btrim(COALESCE(p_business_status, ''))), '');
  v_payout text := NULLIF(upper(btrim(COALESCE(p_payout_status, ''))), '');
  v_verification_labels text[] := ARRAY[
    'NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'EXPIRED'
  ];
  v_payout_labels text[] := ARRAY[
    'NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVIEW_REQUIRED'
  ];
  v_p public.partner_profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- Fail-closed: without the staging flag this RPC does nothing at all.
  IF NOT public.feature_flag_enabled(ARRAY['partner_compliance_fixtures']) THEN
    RAISE EXCEPTION 'FEATURE_DISABLED';
  END IF;

  IF (v_age IS NOT NULL AND NOT (v_age = ANY (v_verification_labels)))
     OR (v_identity IS NOT NULL AND NOT (v_identity = ANY (v_verification_labels)))
     OR (v_business IS NOT NULL AND NOT (v_business = ANY (v_verification_labels)))
     OR (v_payout IS NOT NULL AND NOT (v_payout = ANY (v_payout_labels))) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  UPDATE public.partner_profiles
  SET age_verification_status = COALESCE(v_age::public.partner_verification_status, age_verification_status),
      age_verified_at = CASE
        WHEN v_age = 'VERIFIED' THEN COALESCE(age_verified_at, NOW())
        WHEN v_age IS NOT NULL THEN NULL
        ELSE age_verified_at
      END,
      age_verification_source = CASE
        WHEN v_age = 'VERIFIED' THEN 'staging_fixture'
        WHEN v_age IS NOT NULL THEN NULL
        ELSE age_verification_source
      END,
      identity_verification_status = COALESCE(v_identity::public.partner_verification_status, identity_verification_status),
      identity_verified_at = CASE
        WHEN v_identity = 'VERIFIED' THEN COALESCE(identity_verified_at, NOW())
        WHEN v_identity IS NOT NULL THEN NULL
        ELSE identity_verified_at
      END,
      business_verification_status = COALESCE(v_business::public.partner_verification_status, business_verification_status),
      business_verified_at = CASE
        WHEN v_business = 'VERIFIED' THEN COALESCE(business_verified_at, NOW())
        WHEN v_business IS NOT NULL THEN NULL
        ELSE business_verified_at
      END,
      payout_profile_status = COALESCE(v_payout::public.partner_payout_profile_status, payout_profile_status),
      payout_profile_updated_at = CASE
        WHEN v_payout IS NOT NULL THEN NOW()
        ELSE payout_profile_updated_at
      END,
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING * INTO v_p;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  PERFORM public.portal_write_audit(
    'admin.partner.compliance_fixture',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'age_status', v_p.age_verification_status::text,
      'identity_status', v_p.identity_verification_status::text,
      'business_status', v_p.business_verification_status::text,
      'payout_status', v_p.payout_profile_status::text,
      'fixture', true
    )
  );

  RETURN jsonb_build_object(
    'id', v_p.id,
    'age_verification_status', v_p.age_verification_status::text,
    'identity_verification_status', v_p.identity_verification_status::text,
    'business_verification_status', v_p.business_verification_status::text,
    'payout_profile_status', v_p.payout_profile_status::text,
    'payout_eligible', v_p.payout_eligible,
    'status', v_p.status::text,
    'updated_at', v_p.updated_at,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.staff_set_partner_compliance_fixture(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_set_partner_compliance_fixture(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_set_partner_compliance_fixture(uuid, text, text, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.staff_set_partner_compliance_fixture(uuid, text, text, text, text) IS
  'rc.5 — staging-only synthetic verification fixtures. Raises FEATURE_DISABLED unless feature flag partner_compliance_fixtures is enabled. Never changes status or payout_eligible.';

-- ---------------------------------------------------------------------------
-- 9) reactivate_partner — checklist enforced for non-grandfathered partners
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivate_partner(
  p_partner_id uuid,
  p_reason text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_reason text;
  v_cached jsonb;
  v_partner public.partner_profiles%ROWTYPE;
  v_previous text;
  v_updated timestamptz;
  v_audit_id uuid;
  v_response jsonb;
  v_checklist jsonb;
  v_missing text[];
  v_payout_eligible boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_admin_or_owner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.require_aal2();

  v_reason := public.admin_require_reason(p_reason);
  IF v_key IS NULL THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;

  v_cached := public.admin_idempotency_get(v_key, 'reactivate_partner');
  IF v_cached IS NOT NULL THEN
    IF (v_cached ->> 'id') IS DISTINCT FROM p_partner_id::text THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE id = p_partner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_partner.user_id IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_partner.status <> 'SUSPENDED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  v_previous := v_partner.status::text;

  IF v_partner.legacy_activation_grandfathered THEN
    -- Pre-rc.5 partner: restore the rc.4 behaviour rather than retro-applying a
    -- checklist that never existed when they were activated. No verification
    -- state is invented here.
    v_payout_eligible := true;
  ELSE
    v_checklist := public.partner_activation_checklist(p_partner_id);
    IF NOT COALESCE((v_checklist ->> 'can_activate')::boolean, false) THEN
      SELECT COALESCE(array_agg(m.code ORDER BY m.ord), '{}'::text[])
      INTO v_missing
      FROM jsonb_array_elements_text(v_checklist -> 'missing') WITH ORDINALITY AS m(code, ord);
      RAISE EXCEPTION '%', 'ACTIVATION_DENIED:' || COALESCE(v_missing[1], 'UNKNOWN');
    END IF;
    v_payout_eligible := (v_partner.payout_profile_status = 'APPROVED');
  END IF;

  -- compliance_status is owned by the compliance flow and is left untouched.
  UPDATE public.partner_profiles
  SET status = 'ACTIVE',
      suspended_at = NULL,
      payout_eligible = v_payout_eligible,
      activation_block_codes = '{}'::text[],
      updated_at = NOW()
  WHERE id = p_partner_id
  RETURNING updated_at INTO v_updated;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.partner.reactivated',
    'partner_profiles',
    p_partner_id::text,
    jsonb_build_object(
      'previousStatus', v_previous,
      'newStatus', 'ACTIVE',
      'payoutEligible', v_payout_eligible,
      'payoutProfileStatus', v_partner.payout_profile_status::text,
      'legacyGrandfathered', v_partner.legacy_activation_grandfathered,
      'complianceStatus', v_partner.compliance_status,
      'reason', v_reason,
      'reasonLength', char_length(v_reason),
      'idempotencyKey', v_key
    )
  )
  RETURNING id INTO v_audit_id;

  v_response := jsonb_build_object(
    'id', p_partner_id,
    'previous_status', v_previous,
    'status', 'active',
    'payout_eligible', v_payout_eligible,
    'legacy_activation_grandfathered', v_partner.legacy_activation_grandfathered,
    'updated_at', v_updated,
    'audit_id', v_audit_id
  );

  PERFORM public.admin_idempotency_put(
    v_key, 'reactivate_partner', v_uid, 'partner_profiles', p_partner_id, v_response
  );

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_partner(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reactivate_partner(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reactivate_partner(uuid, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.reactivate_partner(uuid, text, text) IS
  'rc.5 — OWNER/ADMIN + AAL2 reactivation (SUSPENDED → ACTIVE). Grandfathered pre-rc.5 partners keep the rc.4 restore; every other partner must pass partner_activation_checklist or the call raises ACTIVATION_DENIED. Verification state is never fabricated.';

-- ---------------------------------------------------------------------------
-- 10) admin_list_partners — additive identity/compliance keys
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_partners(
  p_limit int DEFAULT 25,
  p_cursor timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_status text := NULLIF(btrim(COALESCE(p_status, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_count int := 0;
  v_next timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_staff_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  WITH page AS (
    SELECT pp.id, pp.user_id, pp.status, pp.display_name, pp.legal_name,
           pp.payout_eligible, pp.compliance_status, pp.created_at, pp.updated_at, pp.suspended_at,
           pp.partner_type, pp.type_classification_status,
           pp.age_verification_status, pp.identity_verification_status,
           pp.business_verification_status, pp.payout_profile_status,
           pp.legacy_activation_grandfathered
    FROM public.partner_profiles pp
    WHERE (p_cursor IS NULL OR pp.created_at < p_cursor)
      AND (v_status IS NULL OR pp.status::text = upper(v_status))
    ORDER BY pp.created_at DESC, pp.id DESC
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'user_id', user_id,
          'status', status::text,
          'display_name', display_name,
          'legal_name', legal_name,
          'payout_eligible', payout_eligible,
          'compliance_status', compliance_status,
          'created_at', created_at,
          'updated_at', updated_at,
          'suspended_at', suspended_at,
          'partner_type', partner_type::text,
          'type_classification_status', type_classification_status::text,
          'age_verification_status', age_verification_status::text,
          'identity_verification_status', identity_verification_status::text,
          'business_verification_status', business_verification_status::text,
          'payout_profile_status', payout_profile_status::text,
          'legacy_activation_grandfathered', legacy_activation_grandfathered
        )
        ORDER BY created_at DESC, id DESC
      ),
      '[]'::jsonb
    ),
    COUNT(*)::int,
    MIN(created_at)
  INTO v_items, v_count, v_next
  FROM page;

  IF v_count < v_limit THEN v_next := NULL; END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next,
    'schema_version', '2026.07.29.partner-identity-directory-rc5'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_partners(int, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_partners(int, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_partners(int, timestamptz, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_list_partners(int, timestamptz, text) IS
  'rc.5 — staff partner directory. rc.4 keys plus partner_type, classification, verification/payout-profile statuses and the grandfather marker. Still no contact details and no balances.';
;
