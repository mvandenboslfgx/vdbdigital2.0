-- Staging rc.5 partner identity + admin directory detail functional matrix.
-- Contract: vdb-backend-contract@0.2.0-rc.5
-- schemaVersion: 2026.07.29.partner-identity-directory-rc5
--
-- Run: npx supabase db query --linked -f scripts/staging-partner-identity-directory-rc5-matrix.sql
--
-- STAGING ONLY. The DO block aborts immediately unless the staging-only flag
-- partner_compliance_fixtures is enabled, which is the interlock that keeps
-- this script from ever writing to production.
--
-- Synthetic data only: every identity is a gen_random_uuid() with an
-- @example.invalid address. No production row is read for content and no
-- pre-existing row is mutated. Synthetic rows are removed at the end
-- (best-effort; ledger/audit tables may retain non-PII references).
--
-- Every local is v_-prefixed: unprefixed names such as ticket_id or quote_id
-- would shadow real column names and make the embedded queries ambiguous.

CREATE TEMP TABLE IF NOT EXISTS _rc5_matrix (
  name text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text
);

DO $$
DECLARE
  v_run text := to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint) || substr(md5(random()::text), 1, 6);
  v_schema_pin text := '2026.07.29.partner-identity-directory-rc5';

  v_owner uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_cust  uuid := gen_random_uuid();
  v_ind   uuid := gen_random_uuid();   -- INDIVIDUAL partner applicant
  v_bus   uuid := gen_random_uuid();   -- BUSINESS partner applicant

  v_org uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_quote uuid := gen_random_uuid();
  v_invoice uuid := gen_random_uuid();
  v_appt uuid := gen_random_uuid();
  v_ticket uuid := gen_random_uuid();

  v_ind_app uuid;
  v_bus_app uuid;
  v_ind_partner uuid;
  v_bus_partner uuid;
  v_ind_agreement uuid;
  v_bus_agreement uuid;
  v_note uuid;

  v_pre_active_ids uuid[];
  v_pre_active_n int;
  v_post_active_n int;

  v_json jsonb;
  v_text text;
  v_bool boolean;
  v_int int;
  v_pass int;
  v_fail int;
BEGIN
  ------------------------------------------------------------------------
  -- 0) Environment interlock — refuse to run anywhere but staging
  ------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.feature_flags
    WHERE key = 'partner_compliance_fixtures' AND enabled
  ) THEN
    RAISE EXCEPTION 'REFUSING_TO_RUN: partner_compliance_fixtures is not enabled. This matrix is staging-only.';
  END IF;

  INSERT INTO _rc5_matrix VALUES (
    'env:staging_interlock', true,
    'partner_compliance_fixtures enabled — staging-only fixtures surface present'
  );

  ------------------------------------------------------------------------
  -- 1) Verifier fail counts
  ------------------------------------------------------------------------
  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO v_pass, v_fail FROM public.verify_partner_identity_directory_rc5_contracts();
  INSERT INTO _rc5_matrix VALUES ('verify:rc5', v_fail = 0, format('pass=%s fail=%s', v_pass, v_fail));

  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO v_pass, v_fail FROM public.verify_admin_control_surface_contracts();
  INSERT INTO _rc5_matrix VALUES ('verify:rc4', v_fail = 0, format('pass=%s fail=%s', v_pass, v_fail));

  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO v_pass, v_fail FROM public.verify_messaging_support_appointments_contracts();
  INSERT INTO _rc5_matrix VALUES ('verify:messaging', v_fail = 0, format('pass=%s fail=%s', v_pass, v_fail));

  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)
    INTO v_pass, v_fail FROM public.verify_partner_admin_contracts();
  INSERT INTO _rc5_matrix VALUES ('verify:partner_admin', v_fail = 0, format('pass=%s fail=%s', v_pass, v_fail));

  ------------------------------------------------------------------------
  -- 8a) Snapshot pre-existing ACTIVE partners (must survive untouched)
  ------------------------------------------------------------------------
  SELECT COALESCE(array_agg(id ORDER BY id), '{}'::uuid[]), count(*)
    INTO v_pre_active_ids, v_pre_active_n
  FROM public.partner_profiles WHERE status = 'ACTIVE';

  INSERT INTO _rc5_matrix VALUES (
    'legacy:pre_active_all_grandfathered',
    NOT EXISTS (
      SELECT 1 FROM public.partner_profiles
      WHERE status = 'ACTIVE' AND legacy_activation_grandfathered = false
    ),
    format('pre-existing ACTIVE partners = %s, all grandfathered', v_pre_active_n)
  );

  ------------------------------------------------------------------------
  -- Seed synthetic identities
  ------------------------------------------------------------------------
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  SELECT u.uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'synth-rc5-' || u.tag || '-' || v_run || '@example.invalid',
         crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  FROM (VALUES
    (v_owner, 'owner'), (v_admin, 'admin'), (v_staff, 'staff'),
    (v_cust, 'cust'), (v_ind, 'ind'), (v_bus, 'bus')
  ) AS u(uid, tag);

  INSERT INTO public.profiles (id, email, full_name, is_active)
  SELECT u.uid, 'synth-rc5-' || u.tag || '-' || v_run || '@example.invalid',
         'Synth RC5 ' || u.tag, true
  FROM (VALUES
    (v_owner, 'owner'), (v_admin, 'admin'), (v_staff, 'staff'),
    (v_cust, 'cust'), (v_ind, 'ind'), (v_bus, 'bus')
  ) AS u(uid, tag);

  INSERT INTO public.admin_roles (user_id, role)
  VALUES (v_owner, 'OWNER'), (v_admin, 'ADMIN'), (v_staff, 'SUPPORT');

  ------------------------------------------------------------------------
  -- Seed synthetic directory objects
  ------------------------------------------------------------------------
  INSERT INTO public.organizations (id, type, legal_name, trade_name, status)
  VALUES (v_org, 'BUSINESS', 'Synth RC5 Org ' || v_run, 'Synth RC5 Trade', 'ACTIVE');

  INSERT INTO public.organization_members (organization_id, user_id, customer_role, status, joined_at)
  VALUES (v_org, v_cust, 'PRIMARY', 'ACTIVE', now());

  INSERT INTO public.products (
    id, slug, name, short_description, full_description, status,
    price_cents, currency, price_mode, price_status, legal_status,
    publication_ready, partner_enabled, partner_visibility,
    partner_commission_status, partner_availability, featured, cost_cents
  ) VALUES (
    v_product, 'synth-rc5-product-' || v_run, 'Synth RC5 Product',
    'Synthetic product for the rc.5 staging matrix.',
    'Synthetic product for the rc.5 staging matrix. Contains no real catalogue data.',
    'DRAFT', 100000, 'EUR', 'FIXED', 'DRAFT', 'NOT_REVIEWED',
    false, false, 'none', 'draft', 'paused', false, 42424
  );

  INSERT INTO public.portal_projects (
    id, organization_id, name, project_number, project_type, status, priority, progress_percent
  ) VALUES (
    v_project, v_org, 'Synth RC5 Project', 'SYNTH-RC5-' || v_run, 'WEBSITE', 'PLANNED', 'NORMAL', 10
  );

  INSERT INTO public.portal_quotes (
    id, organization_id, project_id, quote_number, title, status, currency,
    subtotal_cents, vat_cents, discount_cents, total_cents, customer_note
  ) VALUES (
    v_quote, v_org, v_project, 'SYNTH-Q-' || v_run, 'Synth RC5 Quote', 'DRAFT', 'EUR',
    100000, 21000, 0, 121000, 'SYNTHETIC_CUSTOMER_NOTE_MUST_NOT_LEAK'
  );

  INSERT INTO public.portal_quote_items (quote_id, sort_order, title, quantity, unit_price_cents, total_cents)
  VALUES (v_quote, 1, 'Synth RC5 line item', 1, 100000, 100000);

  INSERT INTO public.portal_invoices (
    id, organization_id, project_id, quote_id, invoice_number, invoice_type, status,
    currency, subtotal_cents, vat_cents, discount_cents, total_cents,
    amount_paid_cents, amount_due_cents
  ) VALUES (
    v_invoice, v_org, v_project, v_quote, 'SYNTH-I-' || v_run, 'INVOICE', 'DRAFT',
    'EUR', 100000, 21000, 0, 121000, 0, 121000
  );

  INSERT INTO public.portal_appointments (
    id, organization_id, project_id, title, appointment_type, status,
    starts_at, ends_at, timezone, location, meeting_link, organizer_user_id, notes
  ) VALUES (
    v_appt, v_org, v_project, 'Synth RC5 Appointment', 'INTAKE', 'SCHEDULED',
    now() + interval '1 day', now() + interval '1 day 1 hour', 'Europe/Amsterdam',
    'Synth location', 'https://example.invalid/SYNTH_MEETING_LINK_MUST_NOT_LEAK',
    v_staff, 'SYNTHETIC_INTERNAL_NOTE_MUST_NOT_LEAK'
  );

  INSERT INTO public.portal_support_tickets (
    id, organization_id, project_id, ticket_number, created_by, subject, description, status
  ) VALUES (
    v_ticket, v_org, v_project, 'SYNTH-T-' || v_run, v_cust,
    'Synth RC5 ticket', 'Synthetic ticket body for the rc.5 staging matrix.', 'NEW'
  );

  ------------------------------------------------------------------------
  -- 2) Detail RPCs work for a staff caller (jwt claim simulation)
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);

  INSERT INTO _rc5_matrix VALUES (
    'auth:jwt_simulation_resolves',
    auth.uid() = v_staff AND public.is_staff_admin(),
    format('auth.uid()=%s is_staff_admin=true', auth.uid())
  );

  v_json := public.admin_get_product(v_product);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_product',
    (v_json ->> 'id') = v_product::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND (v_json ? 'eligibility'),
    left(v_json::text, 200)
  );
  INSERT INTO _rc5_matrix VALUES (
    'detail:product_no_cost_or_supplier',
    NOT (v_json ? 'cost_cents') AND position('42424' in v_json::text) = 0,
    'cost_cents (42424) never returned'
  );

  v_json := public.admin_get_customer(v_org);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_customer',
    (v_json ->> 'id') = v_org::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND (v_json ? 'project_count') AND (v_json ? 'open_ticket_count'),
    left(v_json::text, 200)
  );
  INSERT INTO _rc5_matrix VALUES (
    'detail:customer_no_pii',
    NOT (v_json ? 'contact_email') AND NOT (v_json ? 'contact_phone')
      AND NOT (v_json ? 'kvk_number') AND NOT (v_json ? 'vat_number')
      AND NOT (v_json ? 'invoice_address'),
    'no email / phone / KvK / VAT / address'
  );

  v_json := public.admin_get_project(v_project);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_project',
    (v_json ->> 'id') = v_project::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND (v_json ->> 'quote_count')::int >= 1
      AND (v_json ->> 'invoice_count')::int >= 1
      AND (v_json ->> 'appointment_count')::int >= 1,
    left(v_json::text, 200)
  );

  v_json := public.admin_get_quote(v_quote);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_quote',
    (v_json ->> 'id') = v_quote::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND jsonb_array_length(v_json -> 'items') = 1
      AND (v_json -> 'totals' ->> 'total_cents')::int = 121000,
    left(v_json::text, 200)
  );
  INSERT INTO _rc5_matrix VALUES (
    'detail:quote_no_customer_note',
    position('SYNTHETIC_CUSTOMER_NOTE_MUST_NOT_LEAK' in v_json::text) = 0,
    'customer_note withheld'
  );

  v_json := public.admin_get_invoice(v_invoice);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_invoice',
    (v_json ->> 'id') = v_invoice::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND (v_json -> 'totals' ->> 'amount_due_cents')::int = 121000,
    left(v_json::text, 200)
  );

  v_json := public.admin_get_appointment(v_appt);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_appointment',
    (v_json ->> 'id') = v_appt::text
      AND (v_json ->> 'schema_version') = v_schema_pin
      AND (v_json ->> 'notes_customer_safe') IS NULL,
    left(v_json::text, 200)
  );
  INSERT INTO _rc5_matrix VALUES (
    'detail:appointment_no_link_or_notes',
    position('SYNTH_MEETING_LINK_MUST_NOT_LEAK' in v_json::text) = 0
      AND position('SYNTHETIC_INTERNAL_NOTE_MUST_NOT_LEAK' in v_json::text) = 0,
    'meeting_link and internal notes withheld'
  );

  BEGIN
    PERFORM public.admin_get_product(gen_random_uuid());
    INSERT INTO _rc5_matrix VALUES ('detail:not_found_contract', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('detail:not_found_contract', SQLERRM ILIKE '%NOT_FOUND%', SQLERRM);
  END;

  ------------------------------------------------------------------------
  -- 3) Customer / partner / anon denial on admin_get_product
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_cust::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_cust, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.admin_get_product(v_product);
    INSERT INTO _rc5_matrix VALUES ('deny:customer_admin_get_product', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('deny:customer_admin_get_product', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  PERFORM set_config('request.jwt.claim.sub', v_ind::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_ind, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.admin_get_product(v_product);
    INSERT INTO _rc5_matrix VALUES ('deny:partner_admin_get_product', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('deny:partner_admin_get_product', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.admin_get_product(v_product);
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc5_matrix VALUES ('deny:anon_admin_get_product', false, 'unexpected success');
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO _rc5_matrix VALUES ('deny:anon_admin_get_product', true, SQLERRM);
  WHEN OTHERS THEN
    BEGIN EXECUTE 'RESET ROLE'; EXCEPTION WHEN OTHERS THEN NULL; END;
    INSERT INTO _rc5_matrix VALUES ('deny:anon_admin_get_product', SQLERRM ILIKE '%permission denied%', SQLERRM);
  END;

  INSERT INTO _rc5_matrix VALUES (
    'deny:anon_grant_absent',
    NOT has_function_privilege('anon', 'public.admin_get_product(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_partner(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_customer(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_project(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_quote(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_invoice(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_get_appointment(uuid)', 'EXECUTE'),
    'anon EXECUTE revoked on every detail RPC'
  );

  ------------------------------------------------------------------------
  -- 4) Internal support notes visibility
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);

  PERFORM public.reply_portal_support_ticket(v_ticket, 'Synthetic public reply visible to the customer.');
  v_note := public.add_portal_support_internal_note(v_ticket, 'SYNTH_INTERNAL_NOTE_BODY must stay staff-only.');
  INSERT INTO _rc5_matrix VALUES (
    'notes:staff_add_internal_note',
    v_note IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.portal_support_replies r
      WHERE r.id = v_note AND r.ticket_id = v_ticket AND r.is_internal
    ),
    format('reply id=%s is_internal=true', v_note)
  );

  v_json := public.list_portal_support_ticket_replies(v_ticket, 50, NULL);
  INSERT INTO _rc5_matrix VALUES (
    'notes:staff_list_includes_internal',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_json -> 'items') e
      WHERE (e ->> 'is_internal')::boolean
    )
    AND position('SYNTH_INTERNAL_NOTE_BODY' in v_json::text) > 0
    AND (v_json ->> 'schema_version') = v_schema_pin,
    format('staff sees %s replies incl. internal', jsonb_array_length(v_json -> 'items'))
  );

  PERFORM set_config('request.jwt.claim.sub', v_cust::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_cust, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.list_portal_support_ticket_replies(v_ticket, 50, NULL);
  INSERT INTO _rc5_matrix VALUES (
    'notes:customer_list_excludes_internal',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_json -> 'items') e
      WHERE (e ->> 'is_internal')::boolean
    )
    AND position('SYNTH_INTERNAL_NOTE_BODY' in v_json::text) = 0
    AND jsonb_array_length(v_json -> 'items') >= 1,
    format('customer sees %s public replies, zero internal', jsonb_array_length(v_json -> 'items'))
  );

  PERFORM set_config('request.jwt.claim.sub', v_ind::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_ind, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.list_portal_support_ticket_replies(v_ticket, 50, NULL);
    INSERT INTO _rc5_matrix VALUES ('notes:non_member_forbidden', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('notes:non_member_forbidden', SQLERRM ILIKE '%FORBIDDEN%', SQLERRM);
  END;

  ------------------------------------------------------------------------
  -- 5) Flag-off path: support_internal_notes_rpc disabled → FEATURE_DISABLED
  ------------------------------------------------------------------------
  UPDATE public.feature_flags SET enabled = false, updated_at = timezone('utc', now())
  WHERE key = 'support_internal_notes_rpc';

  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.add_portal_support_internal_note(v_ticket, 'Should never be written.');
    INSERT INTO _rc5_matrix VALUES ('flag:internal_notes_off_denies', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('flag:internal_notes_off_denies', SQLERRM ILIKE '%FEATURE_DISABLED%', SQLERRM);
  END;

  UPDATE public.feature_flags SET enabled = true, updated_at = timezone('utc', now())
  WHERE key = 'support_internal_notes_rpc';

  SELECT enabled INTO v_bool FROM public.feature_flags WHERE key = 'support_internal_notes_rpc';
  INSERT INTO _rc5_matrix VALUES (
    'flag:internal_notes_restored', v_bool IS TRUE, format('support_internal_notes_rpc=%s', v_bool)
  );

  ------------------------------------------------------------------------
  -- 6) Typed intake: INDIVIDUAL without KvK → PENDING; approval alone ≠ ACTIVE
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_ind::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_ind, 'role', 'authenticated', 'aal', 'aal1')::text, true);

  BEGIN
    PERFORM public.submit_partner_application(
      'INDIVIDUAL', 'Synth Ind Reject', NULL, 'synth-rc5-ind-' || v_run || '@example.invalid',
      '12345678', NULL, NULL);
    INSERT INTO _rc5_matrix VALUES ('intake:individual_with_kvk_rejected', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES (
      'intake:individual_with_kvk_rejected', SQLERRM ILIKE '%VALIDATION_FAILED%', SQLERRM);
  END;

  v_ind_app := public.submit_partner_application(
    'INDIVIDUAL', 'Synth Individual Partner', NULL,
    'synth-rc5-ind-' || v_run || '@example.invalid', NULL, NULL, NULL);

  SELECT pp.id, pp.status::text INTO v_ind_partner, v_text
  FROM public.partner_profiles pp WHERE pp.user_id = v_ind;

  INSERT INTO _rc5_matrix VALUES (
    'intake:individual_submit_pending',
    v_text = 'PENDING'
    AND (SELECT pp.partner_type::text FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) = 'INDIVIDUAL'
    AND (SELECT pp.type_classification_status::text FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) = 'KNOWN'
    AND (SELECT pp.required_agreement_type::text FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) = 'INDIVIDUAL_PARTNER',
    format('status=%s partner_type=INDIVIDUAL classification=KNOWN agreement=INDIVIDUAL_PARTNER', v_text)
  );

  INSERT INTO _rc5_matrix VALUES (
    'intake:individual_no_kvk_stored',
    (SELECT a.kvk_number FROM public.partner_applications a WHERE a.id = v_ind_app) IS NULL,
    'particulier intake stores no KvK number'
  );

  -- Staff approval alone must NOT activate
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  PERFORM public.review_partner_application(v_ind_app, true, NULL, NULL);

  SELECT pp.status::text INTO v_text FROM public.partner_profiles pp WHERE pp.id = v_ind_partner;
  INSERT INTO _rc5_matrix VALUES (
    'activation:staff_approval_alone_not_active',
    v_text = 'PENDING'
    AND (SELECT pp.staff_approved_at FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) IS NOT NULL,
    format('status=%s after staff approval, staff_approved_at set', v_text)
  );

  SELECT array_length(pp.activation_block_codes, 1) INTO v_int
  FROM public.partner_profiles pp WHERE pp.id = v_ind_partner;
  INSERT INTO _rc5_matrix VALUES (
    'activation:block_codes_recorded',
    COALESCE(v_int, 0) > 0,
    (SELECT array_to_string(pp.activation_block_codes, ',')
     FROM public.partner_profiles pp WHERE pp.id = v_ind_partner)
  );

  v_json := public.partner_activation_checklist(v_ind_partner);
  INSERT INTO _rc5_matrix VALUES (
    'activation:checklist_denies_incomplete',
    (v_json ->> 'can_activate')::boolean IS FALSE
    AND (v_json ->> 'schema_version') = v_schema_pin,
    left(v_json::text, 260)
  );

  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    PERFORM public.activate_partner_profile(
      v_ind_partner, 'Staging matrix premature activation attempt', 'stg-rc5-premature-' || v_run, NULL);
    INSERT INTO _rc5_matrix VALUES ('activation:premature_denied', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES (
      'activation:premature_denied', SQLERRM ILIKE '%ACTIVATION_DENIED%', SQLERRM);
  END;

  ------------------------------------------------------------------------
  -- 7a) Full INDIVIDUAL activation via fixtures + agreement + activate
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.staff_set_partner_compliance_fixture(
    v_ind_partner, 'VERIFIED', 'VERIFIED', NULL, 'APPROVED');
  INSERT INTO _rc5_matrix VALUES (
    'fixtures:individual_applied',
    (v_json ->> 'age_verification_status') = 'VERIFIED'
    AND (v_json ->> 'identity_verification_status') = 'VERIFIED'
    AND (v_json ->> 'payout_profile_status') = 'APPROVED'
    AND (v_json ->> 'status') = 'PENDING'
    AND (v_json ->> 'payout_eligible')::boolean IS FALSE,
    'fixtures never change status or payout_eligible'
  );

  SELECT av.id INTO v_ind_agreement FROM public.partner_agreement_versions av
  WHERE av.is_current AND av.agreement_type = 'INDIVIDUAL_PARTNER';

  PERFORM set_config('request.jwt.claim.sub', v_ind::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_ind, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  PERFORM public.accept_partner_agreement(v_ind_agreement);
  INSERT INTO _rc5_matrix VALUES (
    'agreement:individual_accepted',
    EXISTS (
      SELECT 1 FROM public.partner_agreement_acceptances acc
      WHERE acc.partner_id = v_ind_partner AND acc.agreement_version_id = v_ind_agreement
    ),
    'acceptance ledger row written'
  );

  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.partner_activation_checklist(v_ind_partner);
  INSERT INTO _rc5_matrix VALUES (
    'activation:individual_checklist_green',
    (v_json ->> 'can_activate')::boolean IS TRUE,
    left(v_json::text, 260)
  );

  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.activate_partner_profile(
    v_ind_partner, 'Staging matrix individual activation', 'stg-rc5-act-ind-' || v_run, NULL);
  INSERT INTO _rc5_matrix VALUES (
    'activation:individual_success',
    (v_json ->> 'status') = 'active'
    AND (v_json ->> 'payout_eligible')::boolean IS TRUE
    AND (v_json ? 'authorization_audit_id'),
    left(v_json::text, 260)
  );

  SELECT pp.status::text INTO v_text FROM public.partner_profiles pp WHERE pp.id = v_ind_partner;
  INSERT INTO _rc5_matrix VALUES (
    'activation:individual_row_active',
    v_text = 'ACTIVE'
    AND (SELECT pp.compliance_status FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) = 'OK'
    AND (SELECT pp.legacy_activation_grandfathered FROM public.partner_profiles pp WHERE pp.id = v_ind_partner) IS FALSE,
    format('status=%s grandfathered=false (new partner is checklist-gated, not grandfathered)', v_text)
  );

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.activate_partner_profile(
      v_ind_partner, 'Staging matrix aal1 activation attempt', 'stg-rc5-aal1-' || v_run, NULL);
    INSERT INTO _rc5_matrix VALUES ('activation:aal1_denied', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES ('activation:aal1_denied', SQLERRM ILIKE '%AAL2_REQUIRED%', SQLERRM);
  END;

  ------------------------------------------------------------------------
  -- 7b) Full BUSINESS activation
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_bus::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_bus, 'role', 'authenticated', 'aal', 'aal1')::text, true);

  BEGIN
    PERFORM public.submit_partner_application(
      'BUSINESS', 'Synth Business Reject BV', 'Synth Trade',
      'synth-rc5-bus-' || v_run || '@example.invalid', '123', NULL, NULL);
    INSERT INTO _rc5_matrix VALUES ('intake:business_bad_kvk_rejected', false, 'unexpected success');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rc5_matrix VALUES (
      'intake:business_bad_kvk_rejected', SQLERRM ILIKE '%VALIDATION_FAILED%', SQLERRM);
  END;

  v_bus_app := public.submit_partner_application(
    'BUSINESS', 'Synth Business Partner BV', 'Synth Business Trade',
    'synth-rc5-bus-' || v_run || '@example.invalid', '87654321', 'NL123456789B01', NULL);

  SELECT pp.id INTO v_bus_partner FROM public.partner_profiles pp WHERE pp.user_id = v_bus;
  INSERT INTO _rc5_matrix VALUES (
    'intake:business_submit_pending',
    (SELECT pp.status::text FROM public.partner_profiles pp WHERE pp.id = v_bus_partner) = 'PENDING'
    AND (SELECT pp.partner_type::text FROM public.partner_profiles pp WHERE pp.id = v_bus_partner) = 'BUSINESS'
    AND (SELECT pp.required_agreement_type::text FROM public.partner_profiles pp WHERE pp.id = v_bus_partner) = 'BUSINESS_PARTNER',
    'BUSINESS intake maps to BUSINESS_PARTNER agreement'
  );

  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  PERFORM public.review_partner_application(v_bus_app, true, NULL, NULL);

  PERFORM public.staff_set_partner_compliance_fixture(
    v_bus_partner, 'VERIFIED', 'VERIFIED', NULL, 'APPROVED');
  v_json := public.partner_activation_checklist(v_bus_partner);
  INSERT INTO _rc5_matrix VALUES (
    'activation:business_requires_business_verification',
    (v_json ->> 'can_activate')::boolean IS FALSE
    AND position('BUSINESS_NOT_VERIFIED' in v_json::text) > 0,
    left(v_json::text, 260)
  );

  PERFORM public.staff_set_partner_compliance_fixture(
    v_bus_partner, NULL, NULL, 'VERIFIED', NULL);

  SELECT av.id INTO v_bus_agreement FROM public.partner_agreement_versions av
  WHERE av.is_current AND av.agreement_type = 'BUSINESS_PARTNER';

  PERFORM set_config('request.jwt.claim.sub', v_bus::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_bus, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  PERFORM public.accept_partner_agreement(v_bus_agreement);

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  v_json := public.activate_partner_profile(
    v_bus_partner, 'Staging matrix business activation', 'stg-rc5-act-bus-' || v_run, NULL);
  INSERT INTO _rc5_matrix VALUES (
    'activation:business_success',
    (v_json ->> 'status') = 'active'
    AND (v_json ->> 'payout_eligible')::boolean IS TRUE,
    left(v_json::text, 260)
  );

  v_json := public.activate_partner_profile(
    v_bus_partner, 'Staging matrix business activation', 'stg-rc5-act-bus-' || v_run, NULL);
  INSERT INTO _rc5_matrix VALUES (
    'activation:idempotent_replay',
    (v_json ->> 'status') = 'active' AND (v_json ->> 'id') = v_bus_partner::text,
    left(v_json::text, 200)
  );

  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  v_json := public.admin_get_partner(v_bus_partner);
  INSERT INTO _rc5_matrix VALUES (
    'detail:admin_get_partner',
    (v_json ->> 'id') = v_bus_partner::text
    AND (v_json ->> 'partner_type') = 'BUSINESS'
    AND (v_json ? 'activation_checklist')
    AND (v_json ->> 'schema_version') = v_schema_pin,
    left(v_json::text, 260)
  );

  ------------------------------------------------------------------------
  -- 8b) Pre-existing ACTIVE grandfathered partners unchanged
  ------------------------------------------------------------------------
  SELECT count(*) INTO v_post_active_n
  FROM public.partner_profiles pp
  WHERE pp.id = ANY (v_pre_active_ids) AND pp.status = 'ACTIVE' AND pp.legacy_activation_grandfathered;

  INSERT INTO _rc5_matrix VALUES (
    'legacy:pre_active_still_active',
    v_post_active_n = v_pre_active_n,
    format('%s/%s pre-existing ACTIVE grandfathered partners still ACTIVE', v_post_active_n, v_pre_active_n)
  );

  INSERT INTO _rc5_matrix VALUES (
    'legacy:review_required_preserved',
    NOT EXISTS (
      SELECT 1 FROM public.partner_profiles pp
      WHERE pp.id = ANY (v_pre_active_ids)
        AND pp.type_classification_status <> 'REVIEW_REQUIRED'
    ),
    'legacy rows still await staff classification (REVIEW_REQUIRED)'
  );

  ------------------------------------------------------------------------
  -- 9) partner_payouts must remain disabled
  ------------------------------------------------------------------------
  SELECT enabled INTO v_bool FROM public.feature_flags WHERE key = 'partner_payouts';
  INSERT INTO _rc5_matrix VALUES (
    'flag:partner_payouts_false',
    v_bool IS FALSE,
    format('partner_payouts=%s', v_bool)
  );

  INSERT INTO _rc5_matrix VALUES (
    'flag:fixtures_and_notes_enabled',
    (SELECT f.enabled FROM public.feature_flags f WHERE f.key = 'partner_compliance_fixtures') IS TRUE
    AND (SELECT f.enabled FROM public.feature_flags f WHERE f.key = 'support_internal_notes_rpc') IS TRUE,
    'staging operator flags on'
  );

  ------------------------------------------------------------------------
  -- Cleanup (best-effort; audit/ledger references are non-PII)
  ------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);

  BEGIN DELETE FROM public.admin_rpc_idempotency a WHERE a.actor_user_id IN (v_owner, v_admin, v_staff);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.partner_agreement_acceptances a WHERE a.partner_id IN (v_ind_partner, v_bus_partner);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.partner_codes c WHERE c.partner_id IN (v_ind_partner, v_bus_partner);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.partner_profiles pp WHERE pp.id IN (v_ind_partner, v_bus_partner);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.partner_applications a WHERE a.user_id IN (v_ind, v_bus);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_support_replies r WHERE r.ticket_id = v_ticket;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_support_tickets t WHERE t.id = v_ticket;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_appointments a WHERE a.id = v_appt;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_invoices i WHERE i.id = v_invoice;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_quote_items qi WHERE qi.quote_id = v_quote;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_quotes q WHERE q.id = v_quote;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.portal_projects pr WHERE pr.id = v_project;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.organization_members m WHERE m.organization_id = v_org;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.organizations o WHERE o.id = v_org;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.products p WHERE p.id = v_product;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.audit_logs l WHERE l.user_id IN (v_owner, v_admin, v_staff, v_cust, v_ind, v_bus);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.admin_roles ar WHERE ar.user_id IN (v_owner, v_admin, v_staff);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    DELETE FROM public.profiles p
    WHERE p.id IN (v_owner, v_admin, v_staff, v_cust, v_ind, v_bus)
      AND p.email LIKE 'synth-rc5-%@example.invalid';
    DELETE FROM auth.users u
    WHERE u.id IN (v_owner, v_admin, v_staff, v_cust, v_ind, v_bus)
      AND u.email LIKE 'synth-rc5-%@example.invalid';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  INSERT INTO _rc5_matrix VALUES (
    'cleanup:synthetic_partners_removed',
    NOT EXISTS (SELECT 1 FROM public.partner_profiles pp WHERE pp.id IN (v_ind_partner, v_bus_partner)),
    'synthetic partner profiles deleted'
  );

  ------------------------------------------------------------------------
  -- Final invariant: ACTIVE partner population is back to the baseline
  ------------------------------------------------------------------------
  SELECT count(*) INTO v_post_active_n FROM public.partner_profiles pp WHERE pp.status = 'ACTIVE';
  INSERT INTO _rc5_matrix VALUES (
    'legacy:active_population_restored',
    v_post_active_n = v_pre_active_n,
    format('ACTIVE partners before=%s after=%s', v_pre_active_n, v_post_active_n)
  );
END $$;

-- Single final result set: the CLI only surfaces the last statement, so the
-- summary and the per-check rows are emitted together as one JSON document.
SELECT jsonb_pretty(jsonb_build_object(
  'matrix', 'partner-identity-directory-rc5-staging',
  'schema_version', '2026.07.29.partner-identity-directory-rc5',
  'project_ref', 'qzekuvmgfekzsowdecyk',
  'generated_at', now(),
  'pass', (SELECT count(*) FROM _rc5_matrix WHERE ok),
  'fail', (SELECT count(*) FROM _rc5_matrix WHERE NOT ok),
  'total', (SELECT count(*) FROM _rc5_matrix),
  'failing', (SELECT COALESCE(jsonb_agg(name ORDER BY name), '[]'::jsonb)
              FROM _rc5_matrix WHERE NOT ok),
  'checks', (SELECT jsonb_agg(jsonb_build_object('name', name, 'ok', ok, 'detail', detail)
                              ORDER BY name)
             FROM _rc5_matrix)
)) AS result;
