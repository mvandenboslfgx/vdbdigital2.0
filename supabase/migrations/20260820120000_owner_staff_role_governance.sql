-- Owner role governance: bootstrap owner protection + assign/revoke RPCs.
-- Local proposal only — do not apply to production without owner approval.
-- Authorization: JWT must be OWNER + AAL2. Email alone is never sufficient.

CREATE OR REPLACE FUNCTION public.is_bootstrap_owner_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_email, ''))) = 'algemeen@vdbdigital.nl';
$$;

COMMENT ON FUNCTION public.is_bootstrap_owner_email(text) IS
  'Protected recovery OWNER identity. Not an authorization grant by itself.';

CREATE OR REPLACE FUNCTION public.is_protected_bootstrap_owner(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND public.is_bootstrap_owner_email(p.email)
  );
$$;

CREATE OR REPLACE FUNCTION public.owner_assign_staff_role(
  p_target_user_id uuid,
  p_role public.admin_role,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.admin_role;
  v_target_email text;
  v_prev public.admin_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  PERFORM public.require_aal2();

  SELECT ar.role INTO v_actor_role
  FROM public.admin_roles ar
  WHERE ar.user_id = v_actor;
  IF v_actor_role IS DISTINCT FROM 'OWNER' THEN
    RAISE EXCEPTION 'FORBIDDEN:OWNER_REQUIRED';
  END IF;

  IF p_role = 'OWNER' THEN
    RAISE EXCEPTION 'FORBIDDEN:CANNOT_ASSIGN_OWNER';
  END IF;
  IF p_role NOT IN ('ADMIN', 'SUPPORT', 'CONTENT') THEN
    RAISE EXCEPTION 'VALIDATION:INVALID_ROLE';
  END IF;
  IF p_target_user_id = v_actor THEN
    RAISE EXCEPTION 'VALIDATION:SELF_CHANGE';
  END IF;
  IF public.is_protected_bootstrap_owner(p_target_user_id) THEN
    RAISE EXCEPTION 'FORBIDDEN:BOOTSTRAP_OWNER_PROTECTED';
  END IF;

  SELECT p.email INTO v_target_email FROM public.profiles p WHERE p.id = p_target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND:USER';
  END IF;

  SELECT ar.role INTO v_prev FROM public.admin_roles ar WHERE ar.user_id = p_target_user_id;
  IF v_prev = 'OWNER' THEN
    RAISE EXCEPTION 'FORBIDDEN:CANNOT_DEMOTE_OWNER';
  END IF;

  INSERT INTO public.admin_roles (user_id, role)
  VALUES (p_target_user_id, p_role)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'target_user_id', p_target_user_id,
    'role', p_role,
    'previous_role', v_prev
  );
END;
$$;

REVOKE ALL ON FUNCTION public.owner_assign_staff_role(uuid, public.admin_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_assign_staff_role(uuid, public.admin_role, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_revoke_staff_role(
  p_target_user_id uuid,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.admin_role;
  v_prev public.admin_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  PERFORM public.require_aal2();

  SELECT ar.role INTO v_actor_role
  FROM public.admin_roles ar
  WHERE ar.user_id = v_actor;
  IF v_actor_role IS DISTINCT FROM 'OWNER' THEN
    RAISE EXCEPTION 'FORBIDDEN:OWNER_REQUIRED';
  END IF;

  IF p_target_user_id = v_actor THEN
    RAISE EXCEPTION 'VALIDATION:SELF_REVOKE';
  END IF;
  IF public.is_protected_bootstrap_owner(p_target_user_id) THEN
    RAISE EXCEPTION 'FORBIDDEN:BOOTSTRAP_OWNER_PROTECTED';
  END IF;

  SELECT ar.role INTO v_prev FROM public.admin_roles ar WHERE ar.user_id = p_target_user_id;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND:ROLE';
  END IF;
  IF v_prev = 'OWNER' THEN
    RAISE EXCEPTION 'FORBIDDEN:CANNOT_REVOKE_OWNER';
  END IF;

  DELETE FROM public.admin_roles WHERE user_id = p_target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'target_user_id', p_target_user_id,
    'previous_role', v_prev
  );
END;
$$;

REVOKE ALL ON FUNCTION public.owner_revoke_staff_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_revoke_staff_role(uuid, text) TO authenticated;
