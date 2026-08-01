/**
 * Local security matrix for admin control surface rc.4.
 * Runs against docker container supabase_db_vdbdigital2.
 * Synthetic UUIDs only — no real PII.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTAINER = "supabase_db_vdbdigital2";
const SCHEMA = "2026.07.29.admin-control-surface-rc4";

const OWNER = randomUUID();
const ADMIN = randomUUID();
const STAFF = randomUUID();
const CUST = randomUUID();
const PARTNER_ACTIVE = randomUUID();
const PARTNER_SUSPENDED = randomUUID();
const PARTNER_PENDING = randomUUID();

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
  const claims = JSON.stringify({
    sub: userId,
    role: "authenticated",
    aal,
  }).replace(/'/g, "''");
  return psql(`
SELECT set_config('request.jwt.claim.sub','${userId}',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','${claims}',true);
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
    const err = e as { message?: string; stderr?: string; stdout?: string };
    const msg = `${err?.message ?? ""}\n${err?.stderr ?? ""}\n${String(e)}`;
    expectOk(name, msg.includes(code), msg.replace(/\s+/g, " ").slice(0, 300));
  }
}

function lastUuid(out: string): string {
  const matches = out.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  );
  return matches?.[matches.length - 1] ?? "";
}

function setup() {
  const run = Date.now().toString(36);
  psql(`
DO $$
DECLARE
  owner_id uuid := '${OWNER}';
  admin_id uuid := '${ADMIN}';
  staff_id uuid := '${STAFF}';
  cust_id uuid := '${CUST}';
  pa uuid := '${PARTNER_ACTIVE}';
  ps uuid := '${PARTNER_SUSPENDED}';
  pp uuid := '${PARTNER_PENDING}';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-owner-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-admin-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (staff_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-staff-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (cust_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-cust-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (pa, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-pa-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (ps, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-ps-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (pp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'synth-pp-${run}@example.invalid', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES
    (owner_id, 'synth-owner-${run}@example.invalid', 'Synth Owner', true),
    (admin_id, 'synth-admin-${run}@example.invalid', 'Synth Admin', true),
    (staff_id, 'synth-staff-${run}@example.invalid', 'Synth Staff', true),
    (cust_id, 'synth-cust-${run}@example.invalid', 'Synth Cust', true),
    (pa, 'synth-pa-${run}@example.invalid', 'Synth PA', true),
    (ps, 'synth-ps-${run}@example.invalid', 'Synth PS', true),
    (pp, 'synth-pp-${run}@example.invalid', 'Synth PP', true);

  INSERT INTO public.admin_roles (user_id, role) VALUES
    (owner_id, 'OWNER'),
    (admin_id, 'ADMIN'),
    (staff_id, 'SUPPORT');

  INSERT INTO public.partner_profiles (user_id, status, display_name, legal_name, payout_eligible)
  VALUES
    (pa, 'ACTIVE', 'Active Partner', 'Active Partner BV', true),
    (ps, 'SUSPENDED', 'Suspended Partner', 'Suspended Partner BV', false),
    (pp, 'PENDING', 'Pending Partner', 'Pending Partner BV', false);

  UPDATE public.partner_profiles SET suspended_at = now() WHERE user_id = ps;
END $$;
`);
}

function main() {
  setup();

  // Verify contracts
  const verifyFail = psql(
    `SELECT count(*)::int FROM public.verify_admin_control_surface_contracts() WHERE ok IS NOT TRUE;`,
  );
  expectOk("verify:all_pass", verifyFail === "0", verifyFail);

  // Dashboard deny matrix
  expectThrows(
    "stats:customer_deny",
    () => asJwt(CUST, "aal1", `SELECT public.admin_dashboard_stats();`),
    "FORBIDDEN",
  );
  expectThrows(
    "stats:partner_deny",
    () => asJwt(PARTNER_ACTIVE, "aal1", `SELECT public.admin_dashboard_stats();`),
    "FORBIDDEN",
  );
  expectThrows(
    "stats:anon_deny",
    () =>
      psql(`
SELECT set_config('request.jwt.claim.role','anon',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.jwt.claim.sub','',true);
SELECT public.admin_dashboard_stats();
`),
    "AUTH_REQUIRED",
  );

  const statsStaff = asJwt(STAFF, "aal1", `SELECT public.admin_dashboard_stats();`);
  expectOk(
    "stats:staff_success",
    statsStaff.includes(SCHEMA) && statsStaff.includes("open_partner_applications"),
    statsStaff.slice(0, 200),
  );
  const statsAdmin = asJwt(ADMIN, "aal1", `SELECT public.admin_dashboard_stats();`);
  expectOk("stats:admin_success", statsAdmin.includes(SCHEMA), statsAdmin.slice(0, 120));
  const statsOwner = asJwt(OWNER, "aal1", `SELECT public.admin_dashboard_stats();`);
  expectOk("stats:owner_success", statsOwner.includes(SCHEMA), statsOwner.slice(0, 120));

  // Empty-ish zeros present
  expectOk(
    "stats:stable_shape",
    [
      "open_partner_applications",
      "open_tickets",
      "commissions_under_review",
      "payout_requests",
      "unread_messages",
      "documents_pending_review",
      "upcoming_appointments",
      "generated_at",
      "schema_version",
    ].every((k) => statsStaff.includes(k)),
  );

  // Direct helper access must be denied for all client roles (ACL hardening).
  // SET ROLE is required: session as postgres bypasses EXECUTE checks.
  const beforeIdem = Number(
    psql(`SELECT count(*)::text FROM public.admin_rpc_idempotency;`),
  );
  for (const [label, uid] of [
    ["customer", CUST],
    ["partner", PARTNER_ACTIVE],
    ["staff", STAFF],
    ["admin", ADMIN],
  ] as const) {
    expectThrows(
      `helper_get:${label}_deny`,
      () =>
        psql(`
BEGIN;
SELECT set_config('request.jwt.claim.sub','${uid}',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"${uid}","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.admin_idempotency_get('k-${label}', 'approve_partner_commission');
COMMIT;
`),
      "permission denied",
    );
    expectThrows(
      `helper_put:${label}_deny`,
      () =>
        psql(`
BEGIN;
SELECT set_config('request.jwt.claim.sub','${uid}',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"${uid}","role":"authenticated","aal":"aal2"}',true);
SET LOCAL ROLE authenticated;
SELECT public.admin_idempotency_put('k-${label}', 'approve_partner_commission', '${uid}'::uuid, 'commission', '${uid}'::uuid, '{}'::jsonb);
COMMIT;
`),
      "permission denied",
    );
  }
  expectThrows(
    "helper_get:anon_deny",
    () =>
      psql(`
BEGIN;
SET LOCAL ROLE anon;
SELECT public.admin_idempotency_get('k-anon', 'approve_partner_commission');
COMMIT;
`),
    "permission denied",
  );
  const afterIdem = Number(
    psql(`SELECT count(*)::text FROM public.admin_rpc_idempotency;`),
  );
  expectOk(
    "helper:denied_writes_no_rows",
    afterIdem === beforeIdem,
    `before=${beforeIdem} after=${afterIdem}`,
  );

  // Work queue
  const queue = asJwt(
    STAFF,
    "aal1",
    `SELECT public.admin_work_queue(10, NULL, NULL);`,
  );
  expectOk("queue:staff_success", queue.includes("items") && queue.includes(SCHEMA), queue.slice(0, 160));
  expectThrows(
    "queue:customer_deny",
    () => asJwt(CUST, "aal1", `SELECT public.admin_work_queue(10, NULL, NULL);`),
    "FORBIDDEN",
  );

  // Seed commission for approve/reject
  const partnerId = psql(
    `SELECT id FROM public.partner_profiles WHERE user_id = '${PARTNER_ACTIVE}';`,
  );
  const keySale1 = `rc4-sale-${randomUUID()}`;
  const keyComm1 = `rc4-comm-${randomUUID()}`;
  const saleOut = psql(`
INSERT INTO public.partner_sales (partner_id, status, gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at)
VALUES ('${partnerId}', 'SETTLED', 100000, 'EUR', '${keySale1}', now(), now())
RETURNING id;
`);
  const saleId = lastUuid(saleOut);
  const commOut = psql(`
INSERT INTO public.partner_commissions (
  partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents, currency,
  calculation_rule_version, idempotency_key
) VALUES (
  '${partnerId}', '${saleId}', 'PENDING', 100000, 1000, 10000, 'EUR', 'v1_flat_bps', '${keyComm1}'
) RETURNING id;
`);
  const commissionId = lastUuid(commOut);

  const idemStaff = `idem-staff-${randomUUID()}`;
  const idemAal1 = `idem-aal1-${randomUUID()}`;
  const idemApprove = `idem-approve-${randomUUID()}`;
  const idemApprove2 = `idem-approve2-${randomUUID()}`;
  const idemReject = `idem-reject-${randomUUID()}`;
  const idemSusStaff = `idem-sus-staff-${randomUUID()}`;
  const idemSusAal1 = `idem-sus-aal1-${randomUUID()}`;
  const idemSus = `idem-sus-${randomUUID()}`;
  const idemRea = `idem-rea-${randomUUID()}`;

  // Staff cannot approve
  expectThrows(
    "commission:staff_deny",
    () =>
      asJwt(
        STAFF,
        "aal2",
        `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'Approve for matrix', '${idemStaff}');`,
      ),
    "FORBIDDEN",
  );

  // AAL1 deny for admin
  expectThrows(
    "commission:aal1_deny",
    () =>
      asJwt(
        ADMIN,
        "aal1",
        `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'Approve for matrix', '${idemAal1}');`,
      ),
    "AAL2_REQUIRED",
  );

  // Admin AAL2 success
  const approved = asJwt(
    ADMIN,
    "aal2",
    `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'Approve for matrix', '${idemApprove}');`,
  );
  expectOk(
    "commission:admin_aal2_success",
    approved.includes('"status": "approved"') || approved.includes('"status":"approved"'),
    approved.slice(0, 220),
  );

  // Idempotent replay
  const replay = asJwt(
    ADMIN,
    "aal2",
    `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'Approve for matrix', '${idemApprove}');`,
  );
  expectOk("commission:idempotent_replay", replay.includes("approved"), replay.slice(0, 160));

  // Invalid transition on second different key
  expectThrows(
    "commission:invalid_transition",
    () =>
      asJwt(
        ADMIN,
        "aal2",
        `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'Approve again xx', '${idemApprove2}');`,
      ),
    "INVALID_TRANSITION",
  );

  // Second commission for reject
  const keySale2 = `rc4-sale-${randomUUID()}`;
  const keyComm2 = `rc4-comm-${randomUUID()}`;
  const sale2 = lastUuid(
    psql(`
INSERT INTO public.partner_sales (partner_id, status, gross_amount_cents, currency, idempotency_key, confirmed_at, settled_at)
VALUES ('${partnerId}', 'SETTLED', 50000, 'EUR', '${keySale2}', now(), now()) RETURNING id;
`),
  );
  const comm2 = lastUuid(
    psql(`
INSERT INTO public.partner_commissions (
  partner_id, partner_sale_id, status, basis_amount_cents, rate_bps, amount_cents, currency,
  calculation_rule_version, idempotency_key
) VALUES (
  '${partnerId}', '${sale2}', 'PENDING', 50000, 1000, 5000, 'EUR', 'v1_flat_bps', '${keyComm2}'
) RETURNING id;
`),
  );
  const rejected = asJwt(
    OWNER,
    "aal2",
    `SELECT public.reject_partner_commission('${comm2}'::uuid, 'Reject for matrix', '${idemReject}');`,
  );
  expectOk(
    "commission:owner_reject_success",
    rejected.includes("rejected"),
    rejected.slice(0, 200),
  );

  // Partner suspend/reactivate
  const suspendedPartnerId = psql(
    `SELECT id FROM public.partner_profiles WHERE user_id = '${PARTNER_ACTIVE}';`,
  );
  expectThrows(
    "suspend:staff_deny",
    () =>
      asJwt(
        STAFF,
        "aal2",
        `SELECT public.suspend_partner('${suspendedPartnerId}'::uuid, 'Suspend reason', '${idemSusStaff}');`,
      ),
    "FORBIDDEN",
  );
  expectThrows(
    "suspend:aal1_deny",
    () =>
      asJwt(
        ADMIN,
        "aal1",
        `SELECT public.suspend_partner('${suspendedPartnerId}'::uuid, 'Suspend reason', '${idemSusAal1}');`,
      ),
    "AAL2_REQUIRED",
  );
  const sus = asJwt(
    ADMIN,
    "aal2",
    `SELECT public.suspend_partner('${suspendedPartnerId}'::uuid, 'Suspend reason', '${idemSus}');`,
  );
  expectOk("suspend:admin_success", sus.includes("suspended"), sus.slice(0, 160));

  const statusAfterSus = psql(
    `SELECT status::text FROM public.partner_profiles WHERE id = '${suspendedPartnerId}';`,
  );
  expectOk("suspend:status_suspended", statusAfterSus === "SUSPENDED", statusAfterSus);

  // Lead create denied while suspended — use named args to disambiguate overloads
  let leadDenied = false;
  let leadDetail = "";
  try {
    asJwt(
      PARTNER_ACTIVE,
      "aal1",
      `SELECT public.create_partner_lead('N'::text, 'n@example.test'::text, 'dedupe-sus-${randomUUID()}'::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::uuid);`,
    );
    leadDetail = "unexpected success";
  } catch (e) {
    const err = e as { message?: string; stderr?: string };
    leadDetail = `${err?.stderr ?? ""}\n${err?.message ?? ""}`;
    leadDenied =
      leadDetail.includes("FORBIDDEN") || leadDetail.includes("AUTH_REQUIRED");
  }
  expectOk("lead:suspended_deny", leadDenied, leadDetail.replace(/\s+/g, " ").slice(0, 400));

  const rea = asJwt(
    OWNER,
    "aal2",
    `SELECT public.reactivate_partner('${suspendedPartnerId}'::uuid, 'Reactivate ok', '${idemRea}');`,
  );
  expectOk("reactivate:owner_success", rea.includes("active"), rea.slice(0, 160));

  // Directory
  const products = asJwt(STAFF, "aal1", `SELECT public.admin_list_products(5, NULL, NULL);`);
  expectOk("dir:products", products.includes("items") && products.includes(SCHEMA));
  expectThrows(
    "dir:partner_deny",
    () => asJwt(PARTNER_ACTIVE, "aal1", `SELECT public.admin_list_partners(5, NULL, NULL);`),
    "FORBIDDEN",
  );

  // Settings / security
  const settings = asJwt(STAFF, "aal1", `SELECT public.admin_get_settings_summary();`);
  expectOk(
    "settings:no_secrets",
    settings.includes("checkout_enabled") && !settings.toLowerCase().includes("service_role"),
  );
  const sec = asJwt(ADMIN, "aal1", `SELECT public.admin_get_security_status();`);
  expectOk(
    "security:aal1_step_up",
    sec.includes("step_up_required") &&
      (sec.includes('"step_up_required": true') || sec.includes('"step_up_required":true')),
    sec.slice(0, 200),
  );

  // Ticket alias
  expectOk(
    "ticket:alias_exists",
    psql(
      `SELECT to_regprocedure('public.transition_portal_support_ticket(uuid,portal_ticket_status)') IS NOT NULL;`,
    ) === "t",
  );

  const outDir = resolve("docs/artifacts");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "admin-control-surface-rc4-local-matrix.json"),
    JSON.stringify({ passed, failed, results, schemaVersion: SCHEMA }, null, 2),
  );

  console.log(`\nSUMMARY pass=${passed} fail=${failed}`);
  if (failed > 0) process.exit(1);
}

main();
