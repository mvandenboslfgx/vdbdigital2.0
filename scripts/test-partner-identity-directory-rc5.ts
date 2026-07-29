/**
 * Local security matrix for partner identity + admin directory detail rc.5.
 * Runs against docker container supabase_db_vdbdigital2.
 * Synthetic UUIDs only — no real PII.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTAINER = "supabase_db_vdbdigital2";
const SCHEMA = "2026.07.29.partner-identity-directory-rc5";

const OWNER = randomUUID();
const ADMIN = randomUUID();
const STAFF = randomUUID();
const CUST = randomUUID();
const PARTNER_LEGACY = randomUUID();
const PARTNER_SUSPENDED = randomUUID();
const PARTNER_INDIVIDUAL = randomUUID();
const PARTNER_BUSINESS = randomUUID();
const PARTNER_BLOCKED = randomUUID();

const ORG = randomUUID();
const PRODUCT = randomUUID();
const PROJECT = randomUUID();
const QUOTE = randomUUID();
const INVOICE = randomUUID();
const APPOINTMENT = randomUUID();
const TICKET = randomUUID();
const MISSING = randomUUID();

/** Every admin_get_* RPC takes exactly one uuid and is staff-gated. */
const DETAIL_RPCS = [
  ["admin_get_product", PRODUCT],
  ["admin_get_customer", ORG],
  ["admin_get_project", PROJECT],
  ["admin_get_quote", QUOTE],
  ["admin_get_invoice", INVOICE],
  ["admin_get_appointment", APPOINTMENT],
] as const;

let passed = 0;
let failed = 0;
const results: { name: string; ok: boolean; detail?: string }[] = [];

function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-F",
      "\t",
      "-c",
      sql,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function asJwt(userId: string, aal: "aal1" | "aal2", sql: string): string {
  const claims = JSON.stringify({ sub: userId, role: "authenticated", aal }).replace(
    /'/g,
    "''",
  );
  return psql(`
SELECT set_config('request.jwt.claim.sub','${userId}',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','${claims}',true);
${sql}
`);
}

function asAnon(sql: string): string {
  return psql(`
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','anon',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
${sql}
`);
}

function expectOk(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed += 1;
    results.push({ name, ok: true });
    console.log(`PASS: ${name}`);
  } else {
    failed += 1;
    results.push({ name, ok: false, detail });
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function expectThrows(name: string, fn: () => void, code: string) {
  try {
    fn();
    expectOk(name, false, `expected throw containing ${code}`);
  } catch (e) {
    const err = e as { message?: string; stderr?: string };
    const msg = `${err?.message ?? ""}\n${err?.stderr ?? ""}\n${String(e)}`;
    expectOk(name, msg.includes(code), msg.replace(/\s+/g, " ").slice(0, 300));
  }
}

function setFlag(key: string, enabled: boolean) {
  psql(
    `INSERT INTO public.feature_flags (key, enabled) VALUES ('${key}', ${enabled})
     ON CONFLICT (key) DO UPDATE SET enabled = ${enabled}, updated_at = now();`,
  );
}

function partnerIdOf(userId: string): string {
  return psql(
    `SELECT id FROM public.partner_profiles WHERE user_id = '${userId}';`,
  );
}

function statusOf(partnerId: string): string {
  return psql(
    `SELECT status::text FROM public.partner_profiles WHERE id = '${partnerId}';`,
  );
}

function blockCodesOf(partnerId: string): string {
  return psql(
    `SELECT activation_block_codes::text FROM public.partner_profiles WHERE id = '${partnerId}';`,
  );
}

function currentAgreementId(type: "INDIVIDUAL" | "BUSINESS"): string {
  return psql(
    `SELECT id FROM public.partner_agreement_versions
     WHERE is_current AND agreement_type = '${type}_PARTNER';`,
  );
}

/** Staging-only synthetic verification data; the flag is restored immediately. */
function setComplianceFixture(
  partnerId: string,
  age: string | null,
  identity: string | null,
  business: string | null,
  payout: string | null,
) {
  const lit = (v: string | null) => (v === null ? "NULL" : `'${v}'`);
  setFlag("partner_compliance_fixtures", true);
  try {
    asJwt(
      ADMIN,
      "aal2",
      `SELECT public.staff_set_partner_compliance_fixture(
  '${partnerId}'::uuid, ${lit(age)}, ${lit(identity)}, ${lit(business)}, ${lit(payout)}
);`,
    );
  } finally {
    setFlag("partner_compliance_fixtures", false);
  }
}

function setup() {
  const run = Date.now().toString(36);
  const user = (id: string, label: string) =>
    `('${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-${label}-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`;
  const profile = (id: string, label: string) =>
    `('${id}', 'synth-${label}-${run}@example.invalid', 'Synth ${label}', true)`;

  psql(`
DO $$
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ${user(OWNER, "owner")},
    ${user(ADMIN, "admin")},
    ${user(STAFF, "staff")},
    ${user(CUST, "cust")},
    ${user(PARTNER_LEGACY, "plegacy")},
    ${user(PARTNER_SUSPENDED, "psusp")},
    ${user(PARTNER_INDIVIDUAL, "pindiv")},
    ${user(PARTNER_BUSINESS, "pbiz")},
    ${user(PARTNER_BLOCKED, "pblock")};

  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES
    ${profile(OWNER, "owner")},
    ${profile(ADMIN, "admin")},
    ${profile(STAFF, "staff")},
    ${profile(CUST, "cust")},
    ${profile(PARTNER_LEGACY, "plegacy")},
    ${profile(PARTNER_SUSPENDED, "psusp")},
    ${profile(PARTNER_INDIVIDUAL, "pindiv")},
    ${profile(PARTNER_BUSINESS, "pbiz")},
    ${profile(PARTNER_BLOCKED, "pblock")};

  INSERT INTO public.admin_roles (user_id, role) VALUES
    ('${OWNER}', 'OWNER'),
    ('${ADMIN}', 'ADMIN'),
    ('${STAFF}', 'SUPPORT');

  -- A pre-rc.5 ACTIVE partner and a suspended one. Both are written directly so
  -- the rc.5 activation path is never used to manufacture its own preconditions.
  INSERT INTO public.partner_profiles (user_id, status, display_name, legal_name, payout_eligible, legacy_activation_grandfathered)
  VALUES
    ('${PARTNER_LEGACY}', 'ACTIVE', 'Legacy Partner', 'Legacy Partner BV', true, true),
    ('${PARTNER_SUSPENDED}', 'SUSPENDED', 'Suspended Partner', 'Suspended Partner BV', false, false);
  UPDATE public.partner_profiles SET suspended_at = now() WHERE user_id = '${PARTNER_SUSPENDED}';

  INSERT INTO public.organizations (id, legal_name, trade_name)
  VALUES ('${ORG}', 'Synth Org BV', 'Synth Org');

  INSERT INTO public.organization_members (organization_id, user_id)
  VALUES ('${ORG}', '${CUST}');

  INSERT INTO public.products (id, slug, name, short_description, full_description)
  VALUES ('${PRODUCT}', 'synth-product-${run}', 'Synth Product', 'Short', 'Full');

  INSERT INTO public.portal_projects (id, organization_id, name, project_number)
  VALUES ('${PROJECT}', '${ORG}', 'Synth Project', 'PRJ-${run}');

  INSERT INTO public.portal_quotes (id, organization_id, project_id, quote_number, title)
  VALUES ('${QUOTE}', '${ORG}', '${PROJECT}', 'QUO-${run}', 'Synth Quote');

  INSERT INTO public.portal_quote_items (quote_id, title, quantity, unit_price_cents, total_cents)
  VALUES ('${QUOTE}', 'Synth Item', 1, 10000, 10000);

  INSERT INTO public.portal_invoices (id, organization_id, project_id, quote_id, invoice_number)
  VALUES ('${INVOICE}', '${ORG}', '${PROJECT}', '${QUOTE}', 'INV-${run}');

  INSERT INTO public.portal_appointments (id, organization_id, project_id, title, starts_at, ends_at, organizer_user_id)
  VALUES ('${APPOINTMENT}', '${ORG}', '${PROJECT}', 'Synth Appointment',
          now() + interval '2 days', now() + interval '2 days 1 hour', '${STAFF}');

  INSERT INTO public.portal_support_tickets (id, organization_id, ticket_number, created_by, subject, description)
  VALUES ('${TICKET}', '${ORG}', 'TCK-${run}', '${CUST}', 'Synth Ticket', 'Synth description');
END $$;
`);

  // Fail-closed defaults are the starting point for every flag test below.
  setFlag("support_internal_notes_rpc", false);
  setFlag("partner_compliance_fixtures", false);
}

function testVerifier() {
  const fails = psql(
    `SELECT count(*)::int FROM public.verify_partner_identity_directory_rc5_contracts() WHERE ok IS NOT TRUE;`,
  );
  expectOk("verify:rc5_all_pass", fails === "0", fails);
  const rc4 = psql(
    `SELECT count(*)::int FROM public.verify_admin_control_surface_contracts() WHERE ok IS NOT TRUE;`,
  );
  expectOk("verify:rc4_still_pass", rc4 === "0", rc4);
  const rc3 = psql(
    `SELECT count(*)::int FROM public.verify_messaging_support_appointments_contracts() WHERE ok IS NOT TRUE;`,
  );
  expectOk("verify:rc3_still_pass", rc3 === "0", rc3);
}

function testDetailRpcAccess() {
  const partnerId = partnerIdOf(PARTNER_LEGACY);
  const targets = [...DETAIL_RPCS, ["admin_get_partner", partnerId]] as const;

  for (const [role, uid] of [
    ["staff", STAFF],
    ["admin", ADMIN],
    ["owner", OWNER],
  ] as const) {
    for (const [fn, id] of targets) {
      const out = asJwt(uid, "aal1", `SELECT public.${fn}('${id}'::uuid);`);
      expectOk(
        `detail:${fn}_${role}_success`,
        out.includes(SCHEMA) && out.includes(id),
        out.slice(0, 200),
      );
    }
  }

  for (const [role, uid] of [
    ["customer", CUST],
    ["partner", PARTNER_LEGACY],
  ] as const) {
    for (const [fn, id] of targets) {
      expectThrows(
        `detail:${fn}_${role}_deny`,
        () => asJwt(uid, "aal1", `SELECT public.${fn}('${id}'::uuid);`),
        "FORBIDDEN",
      );
    }
  }

  for (const [fn, id] of targets) {
    expectThrows(
      `detail:${fn}_anon_deny`,
      () => asAnon(`SELECT public.${fn}('${id}'::uuid);`),
      "AUTH_REQUIRED",
    );
    expectThrows(
      `detail:${fn}_unknown_not_found`,
      () => asJwt(STAFF, "aal1", `SELECT public.${fn}('${MISSING}'::uuid);`),
      "NOT_FOUND",
    );
    expectThrows(
      `detail:${fn}_malformed_rejected`,
      () => asJwt(STAFF, "aal1", `SELECT public.${fn}('not-a-uuid'::uuid);`),
      "invalid input syntax for type uuid",
    );
    void id;
  }

  // Detail payloads must not leak the fields rc.5 deliberately withholds.
  const product = asJwt(STAFF, "aal1", `SELECT public.admin_get_product('${PRODUCT}'::uuid);`);
  expectOk(
    "detail:product_no_cost",
    !product.includes("cost_cents") && !product.includes("supplier"),
    product.slice(0, 200),
  );
  const customer = asJwt(STAFF, "aal1", `SELECT public.admin_get_customer('${ORG}'::uuid);`);
  expectOk(
    "detail:customer_no_contact",
    !customer.includes("contact_email") &&
      !customer.includes("kvk_number") &&
      !customer.includes("invoice_address"),
    customer.slice(0, 200),
  );
  const appointment = asJwt(
    STAFF,
    "aal1",
    `SELECT public.admin_get_appointment('${APPOINTMENT}'::uuid);`,
  );
  expectOk(
    "detail:appointment_no_meeting_link",
    !appointment.includes("meeting_link"),
    appointment.slice(0, 200),
  );
  const partner = asJwt(STAFF, "aal1", `SELECT public.admin_get_partner('${partnerId}'::uuid);`);
  expectOk(
    "detail:partner_has_checklist",
    partner.includes("activation_checklist") && partner.includes("can_activate"),
    partner.slice(0, 200),
  );
}

function testInternalNotes() {
  // Flag off: the internal note RPC must refuse before touching any row.
  setFlag("support_internal_notes_rpc", false);
  expectThrows(
    "notes:flag_off_feature_disabled",
    () =>
      asJwt(
        STAFF,
        "aal1",
        `SELECT public.add_portal_support_internal_note('${TICKET}'::uuid, 'internal note while disabled');`,
      ),
    "FEATURE_DISABLED",
  );
  const leaked = psql(
    `SELECT count(*)::int FROM public.portal_support_replies WHERE ticket_id = '${TICKET}' AND is_internal;`,
  );
  expectOk("notes:flag_off_wrote_nothing", leaked === "0", leaked);

  // A public reply is visible to both sides; the internal note only to staff.
  asJwt(
    STAFF,
    "aal1",
    `SELECT public.reply_portal_support_ticket('${TICKET}'::uuid, 'public reply for matrix');`,
  );

  setFlag("support_internal_notes_rpc", true);
  try {
    const noteOut = asJwt(
      STAFF,
      "aal1",
      `SELECT public.add_portal_support_internal_note('${TICKET}'::uuid, 'internal note for matrix');`,
    );
    expectOk("notes:staff_create_success", noteOut.length > 0, noteOut.slice(0, 120));

    expectThrows(
      "notes:customer_create_deny",
      () =>
        asJwt(
          CUST,
          "aal1",
          `SELECT public.add_portal_support_internal_note('${TICKET}'::uuid, 'customer internal note');`,
        ),
      "FORBIDDEN",
    );

    const staffList = asJwt(
      STAFF,
      "aal1",
      `SELECT public.list_portal_support_ticket_replies('${TICKET}'::uuid, 50, NULL);`,
    );
    expectOk(
      "replies:staff_sees_internal",
      staffList.includes("internal note for matrix") &&
        staffList.includes("public reply for matrix") &&
        staffList.includes(SCHEMA),
      staffList.slice(0, 260),
    );

    const custList = asJwt(
      CUST,
      "aal1",
      `SELECT public.list_portal_support_ticket_replies('${TICKET}'::uuid, 50, NULL);`,
    );
    expectOk(
      "replies:customer_excludes_internal",
      custList.includes("public reply for matrix") &&
        !custList.includes("internal note for matrix"),
      custList.slice(0, 260),
    );
  } finally {
    setFlag("support_internal_notes_rpc", false);
  }

  expectThrows(
    "replies:partner_deny",
    () =>
      asJwt(
        PARTNER_LEGACY,
        "aal1",
        `SELECT public.list_portal_support_ticket_replies('${TICKET}'::uuid, 50, NULL);`,
      ),
    "FORBIDDEN",
  );
  expectThrows(
    "replies:anon_deny",
    () =>
      asAnon(
        `SELECT public.list_portal_support_ticket_replies('${TICKET}'::uuid, 50, NULL);`,
      ),
    "AUTH_REQUIRED",
  );
  expectThrows(
    "replies:unknown_ticket_not_found",
    () =>
      asJwt(
        STAFF,
        "aal1",
        `SELECT public.list_portal_support_ticket_replies('${MISSING}'::uuid, 50, NULL);`,
      ),
    "NOT_FOUND",
  );
}

function testTypedIntake() {
  // A particulier supplies no company data and no KvK.
  const appIndiv = asJwt(
    PARTNER_INDIVIDUAL,
    "aal1",
    `SELECT public.submit_partner_application('INDIVIDUAL','Synth Individual','Synth Individual','synth-pindiv@example.invalid');`,
  );
  const appIndivId = appIndiv.trim().split("\n").pop() ?? "";
  const appIndivStatus = psql(
    `SELECT status::text FROM public.partner_applications WHERE id = '${appIndivId}';`,
  );
  expectOk(
    "intake:individual_submitted",
    appIndivStatus === "SUBMITTED",
    `${appIndivId} -> ${appIndivStatus}`,
  );
  const indivPartnerId = partnerIdOf(PARTNER_INDIVIDUAL);
  expectOk(
    "intake:individual_profile_pending",
    statusOf(indivPartnerId) === "PENDING",
    statusOf(indivPartnerId),
  );
  const indivType = psql(
    `SELECT partner_type::text || '/' || type_classification_status::text
     FROM public.partner_profiles WHERE id = '${indivPartnerId}';`,
  );
  expectOk("intake:individual_type_known", indivType === "INDIVIDUAL/KNOWN", indivType);

  // A particulier that submits a KvK would silently become a business identity.
  expectThrows(
    "intake:individual_with_kvk_deny",
    () =>
      asJwt(
        PARTNER_INDIVIDUAL,
        "aal1",
        `SELECT public.submit_partner_application('INDIVIDUAL','Synth Individual','Synth Individual','synth-pindiv@example.invalid','12345678');`,
      ),
    "VALIDATION_FAILED",
  );

  expectThrows(
    "intake:business_without_kvk_deny",
    () =>
      asJwt(
        PARTNER_BUSINESS,
        "aal1",
        `SELECT public.submit_partner_application('BUSINESS','Synth Business BV','Synth Business','synth-pbiz@example.invalid');`,
      ),
    "VALIDATION_FAILED",
  );
  expectThrows(
    "intake:business_invalid_kvk_deny",
    () =>
      asJwt(
        PARTNER_BUSINESS,
        "aal1",
        `SELECT public.submit_partner_application('BUSINESS','Synth Business BV','Synth Business','synth-pbiz@example.invalid','1234');`,
      ),
    "VALIDATION_FAILED",
  );
  expectThrows(
    "intake:unknown_type_deny",
    () =>
      asJwt(
        PARTNER_BUSINESS,
        "aal1",
        `SELECT public.submit_partner_application('CHARITY','Synth Business BV','Synth Business','synth-pbiz@example.invalid','12345678');`,
      ),
    "VALIDATION_FAILED",
  );
  expectThrows(
    "intake:anon_deny",
    () =>
      asAnon(
        `SELECT public.submit_partner_application('INDIVIDUAL','Anon','Anon','anon@example.invalid');`,
      ),
    "AUTH_REQUIRED",
  );

  const appBiz = asJwt(
    PARTNER_BUSINESS,
    "aal1",
    `SELECT public.submit_partner_application('BUSINESS','Synth Business BV','Synth Business','synth-pbiz@example.invalid','12345678','NL0000',NULL);`,
  );
  const appBizId = appBiz.trim().split("\n").pop() ?? "";
  expectOk("intake:business_submitted", appBizId.length === 36, appBizId);

  return { appIndivId, appBizId };
}

function testApprovalDoesNotActivate(appIndivId: string) {
  const partnerId = partnerIdOf(PARTNER_INDIVIDUAL);

  const reviewed = asJwt(
    STAFF,
    "aal1",
    `SELECT public.review_partner_application('${appIndivId}'::uuid, true, NULL, NULL);`,
  );
  expectOk("approval:review_returns_partner", reviewed.includes(partnerId), reviewed.slice(0, 160));

  const appStatus = psql(
    `SELECT status::text FROM public.partner_applications WHERE id = '${appIndivId}';`,
  );
  expectOk("approval:application_approved", appStatus === "APPROVED", appStatus);
  expectOk(
    "approval:partner_not_active",
    statusOf(partnerId) === "PENDING",
    `status=${statusOf(partnerId)}`,
  );

  const blocks = blockCodesOf(partnerId);
  expectOk(
    "approval:block_codes_recorded",
    blocks.includes("AGREEMENT_NOT_ACCEPTED") &&
      blocks.includes("AGE_NOT_VERIFIED") &&
      blocks.includes("PAYOUT_PROFILE_NOT_APPROVED"),
    blocks,
  );

  const checklist = asJwt(
    STAFF,
    "aal1",
    `SELECT public.partner_activation_checklist('${partnerId}'::uuid);`,
  );
  expectOk(
    "approval:checklist_cannot_activate",
    checklist.includes('"can_activate": false') ||
      checklist.includes('"can_activate":false'),
    checklist.slice(0, 240),
  );

  // The partner may read their own checklist but nobody else's.
  const ownChecklist = asJwt(
    PARTNER_INDIVIDUAL,
    "aal1",
    `SELECT public.partner_activation_checklist('${partnerId}'::uuid);`,
  );
  expectOk("checklist:partner_reads_own", ownChecklist.includes("can_activate"));
  expectThrows(
    "checklist:partner_denied_other",
    () =>
      asJwt(
        PARTNER_INDIVIDUAL,
        "aal1",
        `SELECT public.partner_activation_checklist('${partnerIdOf(PARTNER_LEGACY)}'::uuid);`,
      ),
    "FORBIDDEN",
  );

  return partnerId;
}

function testFixtureGate(partnerId: string) {
  setFlag("partner_compliance_fixtures", false);
  expectThrows(
    "fixtures:flag_off_feature_disabled",
    () =>
      asJwt(
        ADMIN,
        "aal2",
        `SELECT public.staff_set_partner_compliance_fixture('${partnerId}'::uuid, 'VERIFIED', 'VERIFIED', NULL, 'APPROVED');`,
      ),
    "FEATURE_DISABLED",
  );

  setFlag("partner_compliance_fixtures", true);
  try {
    expectThrows(
      "fixtures:partner_self_deny",
      () =>
        asJwt(
          PARTNER_INDIVIDUAL,
          "aal1",
          `SELECT public.staff_set_partner_compliance_fixture('${partnerId}'::uuid, 'VERIFIED', 'VERIFIED', NULL, 'APPROVED');`,
        ),
      "FORBIDDEN",
    );
    expectThrows(
      "fixtures:invalid_label_deny",
      () =>
        asJwt(
          ADMIN,
          "aal2",
          `SELECT public.staff_set_partner_compliance_fixture('${partnerId}'::uuid, 'DEFINITELY_OK', NULL, NULL, NULL);`,
        ),
      "VALIDATION_FAILED",
    );
    const out = asJwt(
      ADMIN,
      "aal2",
      `SELECT public.staff_set_partner_compliance_fixture('${partnerId}'::uuid, 'VERIFIED', 'VERIFIED', NULL, 'PENDING');`,
    );
    expectOk(
      "fixtures:never_changes_status",
      out.includes('"status": "PENDING"') || out.includes('"status":"PENDING"'),
      out.slice(0, 220),
    );
  } finally {
    setFlag("partner_compliance_fixtures", false);
  }
}

function testActivationDenials(partnerId: string) {
  // Age + identity verified, payout profile still PENDING and no agreement.
  expectThrows(
    "activate:payout_profile_denies",
    () =>
      asJwt(
        OWNER,
        "aal2",
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'activation attempt for matrix', '${randomUUID()}', NULL);`,
      ),
    "ACTIVATION_DENIED",
  );
  expectOk(
    "activate:denied_leaves_pending",
    statusOf(partnerId) === "PENDING",
    statusOf(partnerId),
  );

  // Self-activation must be impossible from every partner-reachable entrypoint.
  expectThrows(
    "activate:partner_self_deny",
    () =>
      asJwt(
        PARTNER_INDIVIDUAL,
        "aal2",
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'self activation attempt', '${randomUUID()}', NULL);`,
      ),
    "FORBIDDEN",
  );
  expectThrows(
    "activate:partner_try_activate_deny",
    () =>
      asJwt(
        PARTNER_INDIVIDUAL,
        "aal2",
        `SELECT public.partner_try_activate('${partnerId}'::uuid, NULL);`,
      ),
    "FORBIDDEN",
  );
  expectThrows(
    "activate:staff_deny",
    () =>
      asJwt(
        STAFF,
        "aal2",
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'support activation attempt', '${randomUUID()}', NULL);`,
      ),
    "FORBIDDEN",
  );
  expectThrows(
    "activate:aal1_deny",
    () =>
      asJwt(
        ADMIN,
        "aal1",
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'aal1 activation attempt', '${randomUUID()}', NULL);`,
      ),
    "AAL2_REQUIRED",
  );
  expectThrows(
    "activate:anon_deny",
    () =>
      asAnon(
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'anon activation attempt', '${randomUUID()}', NULL);`,
      ),
    "AUTH_REQUIRED",
  );
  expectThrows(
    "activate:unknown_partner_not_found",
    () =>
      asJwt(
        OWNER,
        "aal2",
        `SELECT public.activate_partner_profile('${MISSING}'::uuid, 'unknown partner activation', '${randomUUID()}', NULL);`,
      ),
    "NOT_FOUND",
  );
}

function testIndividualActivation(partnerId: string) {
  const agreementId = currentAgreementId("INDIVIDUAL");
  expectThrows(
    "agreement:anon_deny",
    () => asAnon(`SELECT public.accept_partner_agreement('${agreementId}'::uuid);`),
    "AUTH_REQUIRED",
  );
  const accepted = asJwt(
    PARTNER_INDIVIDUAL,
    "aal1",
    `SELECT public.accept_partner_agreement('${agreementId}'::uuid);`,
  );
  expectOk("agreement:individual_accepted", accepted.includes("-"), accepted.slice(0, 120));
  const replay = asJwt(
    PARTNER_INDIVIDUAL,
    "aal1",
    `SELECT public.accept_partner_agreement('${agreementId}'::uuid);`,
  );
  expectOk(
    "agreement:acceptance_idempotent",
    replay.trim().split("\n").pop() === accepted.trim().split("\n").pop(),
    `${accepted} vs ${replay}`,
  );

  setComplianceFixture(partnerId, "VERIFIED", "VERIFIED", null, "APPROVED");

  const out = asJwt(
    OWNER,
    "aal2",
    `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'individual activation for matrix', '${randomUUID()}', 'SYNTHINDIV');`,
  );
  expectOk(
    "activate:individual_success",
    out.includes('"status": "active"') || out.includes('"status":"active"'),
    out.slice(0, 240),
  );
  expectOk("activate:individual_active", statusOf(partnerId) === "ACTIVE", statusOf(partnerId));
  const payout = psql(
    `SELECT payout_eligible::text FROM public.partner_profiles WHERE id = '${partnerId}';`,
  );
  expectOk("activate:individual_payout_eligible", payout === "true", payout);
  expectOk(
    "activate:individual_business_untouched",
    psql(
      `SELECT business_verification_status::text FROM public.partner_profiles WHERE id = '${partnerId}';`,
    ) === "NOT_STARTED",
  );
}

function testBusinessActivation(appBizId: string) {
  const partnerId = partnerIdOf(PARTNER_BUSINESS);
  const agreementId = currentAgreementId("BUSINESS");

  asJwt(
    PARTNER_BUSINESS,
    "aal1",
    `SELECT public.accept_partner_agreement('${agreementId}'::uuid);`,
  );

  // Business verification is the one gate a BUSINESS partner cannot skip.
  setComplianceFixture(partnerId, "VERIFIED", "VERIFIED", null, "APPROVED");
  asJwt(
    STAFF,
    "aal1",
    `SELECT public.review_partner_application('${appBizId}'::uuid, true, NULL, NULL);`,
  );
  expectOk(
    "activate:business_needs_business_verification",
    statusOf(partnerId) === "PENDING" &&
      blockCodesOf(partnerId).includes("BUSINESS_NOT_VERIFIED"),
    `${statusOf(partnerId)} ${blockCodesOf(partnerId)}`,
  );

  setComplianceFixture(partnerId, "VERIFIED", "VERIFIED", "VERIFIED", "APPROVED");
  const out = asJwt(
    ADMIN,
    "aal2",
    `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'business activation for matrix', '${randomUUID()}', 'SYNTHBIZ');`,
  );
  expectOk(
    "activate:business_success",
    out.includes('"status": "active"') || out.includes('"status":"active"'),
    out.slice(0, 240),
  );
  expectOk("activate:business_active", statusOf(partnerId) === "ACTIVE", statusOf(partnerId));

  const detail = asJwt(STAFF, "aal1", `SELECT public.admin_get_partner('${partnerId}'::uuid);`);
  expectOk(
    "directory:business_partner_typed",
    detail.includes('"partner_type": "BUSINESS"') ||
      detail.includes('"partner_type":"BUSINESS"'),
    detail.slice(0, 240),
  );
  const list = asJwt(STAFF, "aal1", `SELECT public.admin_list_partners(50, NULL, NULL);`);
  expectOk(
    "directory:list_partners_has_identity_keys",
    list.includes("partner_type") &&
      list.includes("payout_profile_status") &&
      list.includes("type_classification_status"),
    list.slice(0, 240),
  );
}

function testSuspendedPartner() {
  const partnerId = partnerIdOf(PARTNER_SUSPENDED);

  let denied = false;
  let detail = "";
  try {
    asJwt(
      PARTNER_SUSPENDED,
      "aal1",
      `SELECT public.create_partner_lead('Synth Lead','synth-lead@example.invalid','dedupe-${randomUUID()}',NULL,NULL,NULL,NULL,NULL::uuid);`,
    );
    detail = "unexpected success";
  } catch (e) {
    const err = e as { message?: string; stderr?: string };
    detail = `${err?.stderr ?? ""}\n${err?.message ?? ""}`;
    denied = detail.includes("FORBIDDEN") || detail.includes("AUTH_REQUIRED");
  }
  expectOk("lead:suspended_deny", denied, detail.replace(/\s+/g, " ").slice(0, 300));

  // Suspended partners are never activated through the activation path, and a
  // non-grandfathered reactivation must still satisfy the checklist.
  expectThrows(
    "activate:suspended_denied",
    () =>
      asJwt(
        OWNER,
        "aal2",
        `SELECT public.activate_partner_profile('${partnerId}'::uuid, 'suspended activation attempt', '${randomUUID()}', NULL);`,
      ),
    "ACTIVATION_DENIED",
  );
  expectThrows(
    "reactivate:checklist_enforced",
    () =>
      asJwt(
        OWNER,
        "aal2",
        `SELECT public.reactivate_partner('${partnerId}'::uuid, 'reactivation attempt for matrix', '${randomUUID()}');`,
      ),
    "ACTIVATION_DENIED",
  );
  expectOk(
    "reactivate:still_suspended",
    statusOf(partnerId) === "SUSPENDED",
    statusOf(partnerId),
  );
}

function testGrandfatheredPartner() {
  const partnerId = partnerIdOf(PARTNER_LEGACY);
  const checklist = asJwt(
    STAFF,
    "aal1",
    `SELECT public.partner_activation_checklist('${partnerId}'::uuid);`,
  );
  expectOk(
    "legacy:grandfathered_still_active",
    statusOf(partnerId) === "ACTIVE",
    statusOf(partnerId),
  );
  expectOk(
    "legacy:checklist_reports_incomplete",
    checklist.includes('"can_activate": false') ||
      checklist.includes('"can_activate":false'),
    checklist.slice(0, 200),
  );
}

function main() {
  setup();
  testVerifier();
  testDetailRpcAccess();
  testInternalNotes();
  const { appIndivId, appBizId } = testTypedIntake();
  const indivPartnerId = testApprovalDoesNotActivate(appIndivId);
  testFixtureGate(indivPartnerId);
  testActivationDenials(indivPartnerId);
  testIndividualActivation(indivPartnerId);
  testBusinessActivation(appBizId);
  testSuspendedPartner();
  testGrandfatheredPartner();

  // Leave the database on fail-closed defaults regardless of outcome.
  setFlag("support_internal_notes_rpc", false);
  setFlag("partner_compliance_fixtures", false);

  const outDir = resolve("docs/artifacts");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "partner-identity-directory-rc5-local-matrix.json"),
    JSON.stringify(
      {
        contractVersion: "vdb-backend-contract@0.2.0-rc.5",
        schemaVersion: SCHEMA,
        container: CONTAINER,
        passed,
        failed,
        results,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\nSUMMARY pass=${passed} fail=${failed}`);
  if (failed > 0) process.exit(1);
}

main();
