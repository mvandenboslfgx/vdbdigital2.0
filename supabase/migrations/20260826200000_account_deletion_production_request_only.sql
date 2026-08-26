-- Account deletion production closeout: request intake + fail-closed auto-erasure guard.
-- Auto-erasure remains DISABLED until explicitly enabled per environment.

CREATE TABLE IF NOT EXISTS public.account_deletion_runtime_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_erasure_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.account_deletion_runtime_config (id, auto_erasure_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON public.account_deletion_runtime_config FROM PUBLIC;
GRANT SELECT ON public.account_deletion_runtime_config TO authenticated, anon, service_role;
GRANT UPDATE ON public.account_deletion_runtime_config TO service_role;

CREATE OR REPLACE FUNCTION public.account_deletion_capability()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'available', to_regclass('public.account_deletion_requests') IS NOT NULL,
    'request_intake_available', to_regclass('public.account_deletion_requests') IS NOT NULL,
    'auto_erasure_available', COALESCE(
      (SELECT c.auto_erasure_enabled FROM public.account_deletion_runtime_config c WHERE c.id = 1),
      false
    ),
    'version', 2
  );
$$;

REVOKE ALL ON FUNCTION public.account_deletion_capability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_deletion_capability() TO anon, authenticated, service_role;

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
  v_auto BOOLEAN;
BEGIN
  SELECT COALESCE(c.auto_erasure_enabled, false) INTO v_auto
  FROM public.account_deletion_runtime_config c
  WHERE c.id = 1;

  IF NOT COALESCE(v_auto, false) THEN
    RAISE EXCEPTION 'AUTO_ERASURE_DISABLED';
  END IF;

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

  UPDATE public.partner_profiles
  SET display_name = 'Deleted user',
      legal_name = 'Deleted user',
      status = 'SUSPENDED',
      updated_at = timezone('utc', now())
  WHERE user_id = v_uid;

  UPDATE public.profiles
  SET email = 'deleted+' || v_uid::text || '@deleted.local',
      full_name = 'Deleted user',
      is_active = false,
      updated_at = timezone('utc', now())
  WHERE id = v_uid;

  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = v_uid;

  DELETE FROM auth.refresh_tokens rt
  USING auth.sessions s
  WHERE rt.session_id = s.id AND s.user_id = v_uid;

  DELETE FROM auth.sessions WHERE user_id = v_uid;

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
      updated_at = timezone('utc', now()),
      user_id = NULL
  WHERE id = v_req.id;

  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object(
    'id', v_req.id,
    'status', 'COMPLETED',
    'already_processed', false
  );
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'AUTO_ERASURE_DISABLED' THEN
      RAISE;
    END IF;
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
  v_auto BOOLEAN;
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

  SELECT COALESCE(c.auto_erasure_enabled, false) INTO v_auto
  FROM public.account_deletion_runtime_config c
  WHERE c.id = 1;

  IF NOT COALESCE(v_auto, false) THEN
    RETURN jsonb_build_object(
      'id', v_req.id,
      'status', v_req.status,
      'auto_erasure', false,
      'message', 'REQUEST_RECORDED_PENDING_REVIEW'
    );
  END IF;

  RETURN public.process_account_deletion(p_request_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_account_deletion_app(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_account_deletion_app(UUID) TO authenticated, service_role;
