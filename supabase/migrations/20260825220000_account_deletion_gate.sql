-- Account deletion gate — canonical request model, web verification, idempotent processor.
-- Staging-first. Production apply requires explicit owner approval.

DO $$
BEGIN
  CREATE TYPE public.account_deletion_status AS ENUM (
    'REQUESTED',
    'VERIFIED',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.account_deletion_source AS ENUM ('APP', 'WEB');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  status public.account_deletion_status NOT NULL DEFAULT 'REQUESTED',
  request_source public.account_deletion_source NOT NULL,
  reason TEXT,
  retention_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  verified_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_active_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('REQUESTED', 'VERIFIED', 'PROCESSING');

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx
  ON public.account_deletion_requests (status, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.account_deletion_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.account_deletion_requests (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT account_deletion_verifications_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS account_deletion_verifications_email_idx
  ON public.account_deletion_verifications (email_normalized, created_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_requests_select_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_select_own ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS account_deletion_requests_insert_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_insert_own ON public.account_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS account_deletion_requests_staff_all ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_staff_all ON public.account_deletion_requests
  FOR ALL TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

REVOKE ALL ON public.account_deletion_verifications FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.account_deletion_verifications TO service_role;

CREATE OR REPLACE FUNCTION public.account_deletion_capability()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'available', to_regclass('public.account_deletion_requests') IS NOT NULL,
    'version', 1
  );
$$;

REVOKE ALL ON FUNCTION public.account_deletion_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_deletion_capability() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._account_deletion_block_staff_self_delete(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'STAFF_SELF_DELETE_DENIED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req public.account_deletion_requests%ROWTYPE;
  v_org UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  PERFORM public._account_deletion_block_staff_self_delete(v_uid);

  SELECT r.* INTO v_req
  FROM public.account_deletion_requests r
  WHERE r.user_id = v_uid
    AND r.status IN ('REQUESTED', 'VERIFIED', 'PROCESSING')
  ORDER BY r.requested_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_req.id,
      'status', v_req.status,
      'reused', true
    );
  END IF;

  SELECT om.organization_id INTO v_org
  FROM public.organization_members om
  WHERE om.user_id = v_uid AND om.status = 'ACTIVE'
  ORDER BY om.is_primary_contact DESC, om.joined_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.account_deletion_requests (
    user_id, organization_id, status, request_source, reason, verified_at
  ) VALUES (
    v_uid, v_org, 'VERIFIED', 'APP', NULLIF(trim(p_reason), ''), timezone('utc', now())
  )
  RETURNING * INTO v_req;

  RETURN jsonb_build_object(
    'id', v_req.id,
    'status', v_req.status,
    'reused', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_account_deletion_web_verification(
  p_email TEXT,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user UUID;
  v_verification_id UUID;
BEGIN
  IF v_email IS NULL OR length(v_email) < 5 THEN
    RETURN jsonb_build_object('stored', false);
  END IF;

  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('stored', false);
  END IF;

  PERFORM public._account_deletion_block_staff_self_delete(v_user);

  INSERT INTO public.account_deletion_verifications (
    user_id, email_normalized, token_hash, expires_at
  ) VALUES (
    v_user, v_email, p_token_hash, p_expires_at
  )
  RETURNING id INTO v_verification_id;

  RETURN jsonb_build_object('stored', true, 'verification_id', v_verification_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_account_deletion_web_verification(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_account_deletion_web_verification(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_account_deletion_web_token(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ver public.account_deletion_verifications%ROWTYPE;
  v_req public.account_deletion_requests%ROWTYPE;
  v_org UUID;
BEGIN
  SELECT * INTO v_ver
  FROM public.account_deletion_verifications v
  WHERE v.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  IF v_ver.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'TOKEN_ALREADY_USED';
  END IF;

  IF v_ver.expires_at < timezone('utc', now()) THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;

  UPDATE public.account_deletion_verifications
  SET used_at = timezone('utc', now())
  WHERE id = v_ver.id;

  SELECT r.* INTO v_req
  FROM public.account_deletion_requests r
  WHERE r.user_id = v_ver.user_id
    AND r.status IN ('REQUESTED', 'VERIFIED', 'PROCESSING')
  ORDER BY r.requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT om.organization_id INTO v_org
    FROM public.organization_members om
    WHERE om.user_id = v_ver.user_id AND om.status = 'ACTIVE'
    ORDER BY om.is_primary_contact DESC
    LIMIT 1;

    INSERT INTO public.account_deletion_requests (
      user_id, organization_id, status, request_source, verified_at
    ) VALUES (
      v_ver.user_id, v_org, 'VERIFIED', 'WEB', timezone('utc', now())
    )
    RETURNING * INTO v_req;
  ELSE
    UPDATE public.account_deletion_requests
    SET status = 'VERIFIED',
        verified_at = COALESCE(verified_at, timezone('utc', now())),
        request_source = 'WEB',
        updated_at = timezone('utc', now())
    WHERE id = v_req.id
    RETURNING * INTO v_req;
  END IF;

  UPDATE public.account_deletion_verifications
  SET request_id = v_req.id
  WHERE id = v_ver.id;

  RETURN jsonb_build_object(
    'request_id', v_req.id,
    'user_id', v_req.user_id,
    'status', v_req.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_account_deletion_web_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_account_deletion_web_token(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.process_account_deletion(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_req public.account_deletion_requests%ROWTYPE;
  v_uid UUID;
  v_retention JSONB := '{}'::jsonb;
  v_member_count INT;
  v_org UUID;
BEGIN
  SELECT * INTO v_req
  FROM public.account_deletion_requests r
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  IF v_req.status = 'COMPLETED' THEN
    RETURN jsonb_build_object('id', v_req.id, 'status', 'COMPLETED', 'already_processed', true);
  END IF;

  IF v_req.status NOT IN ('VERIFIED', 'PROCESSING') THEN
    RAISE EXCEPTION 'REQUEST_NOT_VERIFIED';
  END IF;

  v_uid := v_req.user_id;

  UPDATE public.account_deletion_requests
  SET status = 'PROCESSING',
      processing_started_at = COALESCE(processing_started_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  WHERE id = v_req.id;

  -- Capture orgs before membership removal
  DROP TABLE IF EXISTS _del_user_orgs;
  CREATE TEMP TABLE _del_user_orgs (org_id UUID) ON COMMIT DROP;
  INSERT INTO _del_user_orgs (org_id)
  SELECT DISTINCT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = v_uid;

  DELETE FROM public.portal_project_members WHERE user_id = v_uid;
  DELETE FROM public.portal_conversation_participants WHERE user_id = v_uid;
  DELETE FROM public.portal_appointment_participants WHERE user_id = v_uid;
  DELETE FROM public.portal_notifications WHERE user_id = v_uid;
  DELETE FROM public.admin_roles WHERE user_id = v_uid;
  DELETE FROM public.carts WHERE user_id = v_uid;
  DELETE FROM public.organization_members WHERE user_id = v_uid;

  -- Anonymize authored messages (retain thread)
  UPDATE public.portal_messages
  SET body = '[deleted]',
      deleted_at = COALESCE(deleted_at, timezone('utc', now()))
  WHERE author_user_id = v_uid;

  UPDATE public.portal_support_replies
  SET body = '[deleted]'
  WHERE author_user_id = v_uid;

  FOR v_org IN SELECT org_id FROM _del_user_orgs LOOP
    SELECT count(*) INTO v_member_count
    FROM public.organization_members om
    WHERE om.organization_id = v_org AND om.status = 'ACTIVE';

    IF v_member_count = 0 THEN
      UPDATE public.organizations
      SET contact_email = NULL,
          contact_phone = NULL,
          updated_at = timezone('utc', now())
      WHERE id = v_org;
      v_retention := v_retention || jsonb_build_object('org_anonymized', v_org);
    ELSE
      v_retention := v_retention || jsonb_build_object('shared_org_preserved', v_org);
    END IF;
  END LOOP;

  v_retention := v_retention || jsonb_build_object(
    'financial', jsonb_build_array('portal_invoices', 'portal_invoice_payment_records', 'orders', 'payments'),
    'legal_review', jsonb_build_array('portal_files', 'portal_support_tickets')
  );

  -- Partner profile deactivate (ledger retained)
  UPDATE public.partner_profiles
  SET display_name = 'Deleted user',
      legal_name = 'Deleted user',
      status = 'SUSPENDED',
      updated_at = timezone('utc', now())
  WHERE user_id = v_uid;

  -- Anonymize profile row when present (audit_logs.user_id FK targets profiles)
  UPDATE public.profiles
  SET email = 'deleted+' || v_uid::text || '@deleted.local',
      full_name = 'Deleted user',
      is_active = false,
      updated_at = timezone('utc', now())
  WHERE id = v_uid;

  -- Detach historical audit rows before auth/profile removal (audit_logs.user_id → profiles, NO ACTION).
  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = v_uid;

  -- Revoke sessions
  DELETE FROM auth.refresh_tokens rt
  USING auth.sessions s
  WHERE rt.session_id = s.id AND s.user_id = v_uid;

  DELETE FROM auth.sessions WHERE user_id = v_uid;

  -- Audit marker (user_id must stay NULL so profile/auth delete cannot violate FK)
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NULL,
    'account.deletion.completed',
    'account_deletion_requests',
    v_req.id::text,
    jsonb_build_object('deleted_user_id', v_uid, 'source', v_req.request_source, 'retention', v_retention)
  );

  UPDATE public.account_deletion_requests
  SET status = 'COMPLETED',
      completed_at = timezone('utc', now()),
      retention_summary = v_retention,
      reason = NULL,
      updated_at = timezone('utc', now())
  WHERE id = v_req.id;

  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object(
    'id', v_req.id,
    'status', 'COMPLETED',
    'already_processed', false
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.account_deletion_requests
    SET status = 'REJECTED',
        error_code = SQLERRM,
        updated_at = timezone('utc', now())
    WHERE id = p_request_id;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_account_deletion_app(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.account_deletion_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM public.account_deletion_requests
  WHERE id = p_request_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_req.status = 'COMPLETED' THEN
    RETURN jsonb_build_object('id', v_req.id, 'status', 'COMPLETED');
  END IF;

  RETURN public.process_account_deletion(p_request_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_account_deletion_app(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_account_deletion_app(UUID) TO authenticated;

COMMENT ON TABLE public.account_deletion_requests IS
  'Canonical account deletion requests — APP and WEB converge here. Financial records retained per policy.';
