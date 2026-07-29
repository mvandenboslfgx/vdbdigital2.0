-- Staging RC4 security/functional matrix (synthetic UUIDs only).
-- Run: npx supabase db query --linked -f scripts/staging-admin-control-surface-rc4-matrix.sql
-- Cleans up its own synth rows at the end.

CREATE TEMP TABLE IF NOT EXISTS _rc4_matrix (
  name text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text
);

DO $$
DECLARE
  run text := to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint) || substr(md5(random()::text), 1, 6);
  owner_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  cust_id uuid := gen_random_uuid();
  pa uuid := gen_random_uuid();
  ps uuid := gen_random_uuid();
  pp uuid := gen_random_uuid();
  partner_id uuid;
  sale_id uuid;
  comm_id uuid;
  sale2 uuid;
  comm2 uuid;
  before_idem bigint;
  after_idem bigint;
  v_json jsonb;
  v_text text;
  v_err text;
  schema_pin text := '2026.07.29.admin-control-surface-rc4';
  pass_n int;
  fail_n int;
BEGIN
  -- Seed synthetic identities
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-owner-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-admin-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (staff_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-staff-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (cust_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-cust-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (pa, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-pa-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (ps, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-ps-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (pp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-pp-'||run||'@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.profiles (id, email, full_name, is_active) VALUES
    (owner_id, 'synth-owner-'||run||'@example.invalid', 'Synth Owner', true),
    (admin_id, 'synth-admin-'||run||'@example.invalid', 'Synth Admin', true),
    (staff_id, 'synth-staff-'||run||'@example.invalid', 'Synth Staff', true),
    (cust_id, 'synth-cust-'||run||'@example.invalid', 'Synth Cust', true),
    (pa, 'synth-pa-'||run||'@example.invalid', 'Synth PA', true),
    (ps, 'synth-ps-'||run||'@example.invalid', 'Synth PS', true),
    (pp, 'synth-pp-'||run||'@example.invalid', 'Synth PP', true);

  INSERT INTO public.admin_roles (user_id, role) VALUES
    (owner_id, 'OWNER'), (admin_id, 'ADMIN'), (staff_id, 'SUPPORT');

  INSERT INTO public.partner_profiles (user_id, status, display_name, legal_name, payout_eligible)
  VALUES
    (pa, 'ACTIVE', 'Active Partner', 'Active Partner BV', true),
    (ps, 'SUSPENDED', 'Suspended Partner', 'Suspended Partner BV', false),
    (pp, 'PENDING', 'Pending Partner', 'Pending Partner BV', false);
  UPDATE public.partner_profiles SET suspended_at = now() WHERE user_id = ps;

  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO pass_n, fail_n
  FROM public.verify_admin_control_surface_contracts();
  INSERT INTO _rc4_matrix VALUES ('verify:counts', fail_n = 0 AND pass_n >= 40, format('pass=%s fail=%s', pass_n, fail_n));

  INSERT INTO _rc4_matrix VALUES (
    'acl:helpers_client_deny',
    NOT has_function_privilege('anon', 'public.admin_idempotency_get(text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.admin_idempotency_get(text,text)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.admin_idempotency_get(text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.admin_idempotency_put(text,text,uuid,text,uuid,jsonb)', 'EXECUTE'),
    'privilege probe'
  );

  -- Direct helper call as authenticated (must permission denied)
  SELECT count(*) INTO before_idem FROM public.admin_rpc_idempotency;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.admin_idempotency_get('staging-deny', 'approve_partner_commission');
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc4_matrix VALUES ('helper_get:authenticated_direct', false, 'unexpected success');
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc4_matrix VALUES ('helper_get:authenticated_direct', true, SQLERRM);
  WHEN OTHERS THEN
    BEGIN EXECUTE 'RESET ROLE'; EXCEPTION WHEN OTHERS THEN NULL; END;
    INSERT INTO _rc4_matrix VALUES ('helper_get:authenticated_direct', SQLERRM ILIKE '%permission denied%', SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.admin_idempotency_get('staging-deny-anon', 'approve_partner_commission');
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc4_matrix VALUES ('helper_get:anon_direct', false, 'unexpected success');
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc4_matrix VALUES ('helper_get:anon_direct', true, SQLERRM);
  WHEN OTHERS THEN
    BEGIN EXECUTE 'RESET ROLE'; EXCEPTION WHEN OTHERS THEN NULL; END;
    INSERT INTO _rc4_matrix VALUES ('helper_get:anon_direct', SQLERRM ILIKE '%permission denied%', SQLERRM);
  END;

  SELECT count(*) INTO after_idem FROM public.admin_rpc_idempotency;
  INSERT INTO _rc4_matrix VALUES ('helper:no_row_on_deny', after_idem = before_idem, format('%s->%s', before_idem, after_idem));

  -- Role JWT helper
  PERFORM set_config('request.jwt.claim.sub', cust_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.admin_dashboard_stats();
    INSERT INTO _rc4_matrix VALUES ('stats:customer_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('stats:customer_deny', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', pa::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.admin_dashboard_stats();
    INSERT INTO _rc4_matrix VALUES ('stats:partner_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('stats:partner_deny', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', staff_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.admin_dashboard_stats();
  INSERT INTO _rc4_matrix VALUES (
    'stats:staff_success',
    (v_json ? 'open_partner_applications') AND (v_json->>'schema_version') = schema_pin,
    left(v_json::text, 160)
  );

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.admin_work_queue(5, NULL, NULL);
  INSERT INTO _rc4_matrix VALUES ('queue:admin_success', v_json ? 'items', left(v_json::text, 120));

  PERFORM set_config('request.jwt.claim.sub', cust_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cust_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.admin_list_partners(5, NULL, NULL);
    INSERT INTO _rc4_matrix VALUES ('dir:customer_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('dir:customer_deny', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', staff_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.admin_list_products(5, NULL, NULL);
  INSERT INTO _rc4_matrix VALUES ('dir:products_staff', v_json ? 'items', left(v_json::text, 120));
  v_json := public.admin_get_settings_summary();
  INSERT INTO _rc4_matrix VALUES (
    'settings:no_secrets',
    (v_json ? 'checkout_enabled') AND position('service_role' in lower(v_json::text)) = 0,
    left(v_json::text, 120)
  );

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.admin_get_security_status();
  INSERT INTO _rc4_matrix VALUES (
    'security:aal1_step_up',
    COALESCE((v_json->>'step_up_required')::boolean, false) IS TRUE,
    left(v_json::text, 160)
  );

  -- Commission seed
  SELECT id INTO partner_id FROM public.partner_profiles WHERE user_id = pa;
  INSERT INTO public.partner_sales (partner_id, status, gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at)
  VALUES (partner_id, 'SETTLED', 100000, 'EUR', 'stg-sale-'||run||'-1', now(), now())
  RETURNING id INTO sale_id;
  INSERT INTO public.partner_commissions (
    partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents, currency,
    calculation_rule_version, idempotency_key
  ) VALUES (
    partner_id, sale_id, 'PENDING', 100000, 1000, 10000, 'EUR', 'v1_flat_bps', 'stg-comm-'||run||'-1'
  ) RETURNING id INTO comm_id;

  -- staff deny approve
  PERFORM set_config('request.jwt.claim.sub', staff_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    PERFORM public.approve_partner_commission(comm_id, 'Approve for staging matrix', 'stg-idem-staff-'||run);
    INSERT INTO _rc4_matrix VALUES ('commission:staff_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('commission:staff_deny', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  -- AAL1 deny
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.approve_partner_commission(comm_id, 'Approve for staging matrix', 'stg-idem-aal1-'||run);
    INSERT INTO _rc4_matrix VALUES ('commission:aal1_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('commission:aal1_deny', SQLERRM ILIKE '%AAL2_REQUIRED%', SQLERRM);
  END;

  -- AAL2 success + idempotent replay
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.approve_partner_commission(comm_id, 'Approve for staging matrix', 'stg-idem-approve-'||run);
  INSERT INTO _rc4_matrix VALUES ('commission:admin_aal2_success', v_json->>'status' = 'approved', left(v_json::text, 160));
  v_json := public.approve_partner_commission(comm_id, 'Approve for staging matrix', 'stg-idem-approve-'||run);
  INSERT INTO _rc4_matrix VALUES ('commission:idempotent_replay', v_json->>'status' = 'approved', left(v_json::text, 160));

  INSERT INTO _rc4_matrix VALUES (
    'commission:audit_present',
    EXISTS (
      SELECT 1 FROM public.audit_logs
      WHERE resource_id = comm_id::text
         OR (action ILIKE '%commission%' AND metadata::text ILIKE '%'||comm_id::text||'%')
    ),
    'audit probe'
  );

  -- Reject path
  INSERT INTO public.partner_sales (partner_id, status, gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at)
  VALUES (partner_id, 'SETTLED', 50000, 'EUR', 'stg-sale-'||run||'-2', now(), now())
  RETURNING id INTO sale2;
  INSERT INTO public.partner_commissions (
    partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents, currency,
    calculation_rule_version, idempotency_key
  ) VALUES (
    partner_id, sale2, 'PENDING', 50000, 1000, 5000, 'EUR', 'v1_flat_bps', 'stg-comm-'||run||'-2'
  ) RETURNING id INTO comm2;

  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.reject_partner_commission(comm2, 'Reject for staging matrix', 'stg-idem-reject-'||run);
  INSERT INTO _rc4_matrix VALUES ('commission:owner_reject', v_json->>'status' = 'rejected', left(v_json::text, 160));

  -- Suspend / reactivate
  PERFORM set_config('request.jwt.claim.sub', staff_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    PERFORM public.suspend_partner(partner_id, 'Suspend reason xx', 'stg-idem-sus-staff-'||run);
    INSERT INTO _rc4_matrix VALUES ('suspend:staff_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('suspend:staff_deny', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.suspend_partner(partner_id, 'Suspend reason xx', 'stg-idem-sus-aal1-'||run);
    INSERT INTO _rc4_matrix VALUES ('suspend:aal1_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES ('suspend:aal1_deny', SQLERRM ILIKE '%AAL2_REQUIRED%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.suspend_partner(partner_id, 'Suspend reason xx', 'stg-idem-sus-'||run);
  INSERT INTO _rc4_matrix VALUES ('suspend:admin_success', v_json->>'status' = 'suspended', left(v_json::text, 160));

  SELECT status::text INTO v_text FROM public.partner_profiles WHERE id = partner_id;
  INSERT INTO _rc4_matrix VALUES ('suspend:status', v_text = 'SUSPENDED', v_text);

  -- Suspended partner cannot create lead
  PERFORM set_config('request.jwt.claim.sub', pa::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.create_partner_lead('N'::text, 'n@example.test'::text, 'dedupe-stg-'||run, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid);
    INSERT INTO _rc4_matrix VALUES ('lead:suspended_deny', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc4_matrix VALUES (
      'lead:suspended_deny',
      SQLERRM ILIKE '%FORBIDDEN%' OR SQLERRM ILIKE '%AUTH_REQUIRED%',
      SQLERRM
    );
  END;

  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.reactivate_partner(partner_id, 'Reactivate ok xx', 'stg-idem-rea-'||run);
  INSERT INTO _rc4_matrix VALUES ('reactivate:owner_success', v_json->>'status' = 'active', left(v_json::text, 160));

  -- Payout mutations not newly activated / not callable as admin surface change
  INSERT INTO _rc4_matrix VALUES (
    'payout:mutations_unchanged_boundary',
    EXISTS (
      SELECT 1 FROM public.verify_admin_control_surface_contracts()
      WHERE check_name = 'no_payout_mutation_added' AND ok
    ),
    'verify money boundary'
  );

  INSERT INTO _rc4_matrix VALUES (
    'ticket:alias_exists',
    to_regprocedure('public.transition_portal_support_ticket(uuid,portal_ticket_status)') IS NOT NULL,
    'deprecated alias'
  );

  -- Cleanup synth (best-effort; ledger/audit may retain non-PII refs)
  BEGIN
    DELETE FROM public.admin_rpc_idempotency WHERE actor_user_id IN (owner_id, admin_id, staff_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM public.partner_commissions WHERE partner_id = partner_id AND status IN ('PENDING','REJECTED');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- leave approved commission + sales if ledger-bound; tag emails are @example.invalid
  BEGIN
    DELETE FROM public.partner_profiles WHERE user_id IN (ps, pp);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    UPDATE public.partner_profiles SET status = 'ACTIVE', payout_eligible = true, suspended_at = NULL
    WHERE user_id = pa AND status = 'SUSPENDED';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM public.admin_roles WHERE user_id IN (owner_id, admin_id, staff_id);
    DELETE FROM public.profiles WHERE id IN (owner_id, admin_id, staff_id, cust_id, ps, pp)
      AND email LIKE 'synth-%@example.invalid';
    DELETE FROM auth.users WHERE id IN (owner_id, admin_id, staff_id, cust_id, ps, pp)
      AND email LIKE 'synth-%@example.invalid';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

SELECT name, ok, detail FROM _rc4_matrix ORDER BY name;
SELECT count(*) FILTER (WHERE ok) AS pass, count(*) FILTER (WHERE NOT ok) AS fail FROM _rc4_matrix;
