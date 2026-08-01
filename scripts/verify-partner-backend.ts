/**
 * Local partner backend integrity: scenarios 4–6, 8–10 + financial invariants.
 * Uses only supabase_db_vdbdigital2. No remote. No sibling containers.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CONTAINER = "supabase_db_vdbdigital2";

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

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const STAFF = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";

function asUser(uid: string, sql: string): string {
  return psql(
    `${sql}\nFROM (SELECT set_config('request.jwt.claim.sub','${uid}',true)) s;`,
  );
}

/** rc.4 governance RPCs call require_aal2(), which reads request.jwt.claims. */
function asUserAal2(uid: string, sql: string): string {
  return psql(`
SELECT set_config('request.jwt.claim.sub','${uid}',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"${uid}","role":"authenticated","aal":"aal2"}',true);
${sql}
`);
}

function setComplianceFlag(enabled: boolean) {
  psql(
    `UPDATE public.feature_flags SET enabled = ${enabled}, updated_at = now() WHERE key = 'partner_compliance_fixtures';`,
  );
}

/**
 * rc.5 moved activation out of application approval: a partner only reaches
 * ACTIVE once partner_activation_checklist passes. The scenarios below need
 * ACTIVE partners, so they walk the real checklist instead of writing status
 * directly — accept the current agreement, record synthetic verification
 * fixtures, then let staff approval run partner_try_activate.
 */
function driveToActive(
  partnerUserId: string,
  applicationId: string,
  partnerCode: string,
  partnerType: "INDIVIDUAL" | "BUSINESS",
): string {
  const partnerId = psql(
    `SELECT id FROM public.partner_profiles WHERE user_id = '${partnerUserId}'::uuid;`,
  );
  assert(!!partnerId, `driveToActive: no PENDING profile for ${partnerUserId}`);

  const versionId = psql(`
SELECT id FROM public.partner_agreement_versions
WHERE is_current
  AND agreement_type = '${partnerType === "BUSINESS" ? "BUSINESS_PARTNER" : "INDIVIDUAL_PARTNER"}';
`);
  asUser(
    partnerUserId,
    `SELECT public.accept_partner_agreement('${versionId}'::uuid)`,
  );

  setComplianceFlag(true);
  try {
    asUser(
      STAFF,
      `SELECT public.staff_set_partner_compliance_fixture(
  '${partnerId}'::uuid, 'VERIFIED', 'VERIFIED',
  ${partnerType === "BUSINESS" ? "'VERIFIED'" : "NULL"}, 'APPROVED'
)`,
    );
  } finally {
    setComplianceFlag(false);
  }

  const reviewed = asUser(
    STAFF,
    `SELECT public.review_partner_application('${applicationId}'::uuid, true, NULL, '${partnerCode}')`,
  );
  assert(reviewed === partnerId, `driveToActive: review returned ${reviewed}`);

  const status = psql(
    `SELECT status::text FROM public.partner_profiles WHERE id = '${partnerId}'::uuid;`,
  );
  const blocks = psql(
    `SELECT activation_block_codes::text FROM public.partner_profiles WHERE id = '${partnerId}'::uuid;`,
  );
  assert(
    status === "ACTIVE",
    `driveToActive: ${partnerType} partner stayed ${status} (blocked by ${blocks})`,
  );

  return partnerId;
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  console.log("=== Partner backend local integrity ===");

  // Contract verify RPC
  const verifyOut = psql(
    `SELECT check_name, ok::text FROM public.verify_partner_admin_contracts() WHERE ok IS NOT TRUE;`,
  );
  assert(verifyOut === "", `verify_partner_admin_contracts failures:\n${verifyOut}`);
  console.log("CONTRACT VERIFY: PASS");

  // Synthetic fixture users (auth.users + profiles)
  psql(`
DO $$
DECLARE
  staff_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  partner_a uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  partner_b uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  customer_id uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
BEGIN
  -- Clean prior fixture rows (idempotent); disable ledger immutability for reset only
  ALTER TABLE public.partner_ledger_entries DISABLE TRIGGER USER;
  ALTER TABLE public.partner_ledger_transactions DISABLE TRIGGER USER;
  DELETE FROM public.partner_ledger_entries WHERE transaction_id IN (
    SELECT id FROM public.partner_ledger_transactions
    WHERE idempotency_key LIKE 'fixture:%'
       OR idempotency_key LIKE '%:ledger'
       OR actor_user_id IN (staff_id, partner_a, partner_b)
  );
  DELETE FROM public.partner_ledger_transactions
  WHERE idempotency_key LIKE 'fixture:%'
     OR actor_user_id IN (staff_id, partner_a, partner_b);
  ALTER TABLE public.partner_ledger_entries ENABLE TRIGGER USER;
  ALTER TABLE public.partner_ledger_transactions ENABLE TRIGGER USER;

  DELETE FROM public.partner_adjustments WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_cash_receipts WHERE actor_user_id IN (staff_id, partner_a, partner_b);
  DELETE FROM public.partner_payouts WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_payout_requests WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_commissions WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  UPDATE public.partner_leads SET converted_sale_id = NULL WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_sales WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_leads WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  DELETE FROM public.partner_codes WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b));
  -- Fixture idempotency keys are stable but the resources they point at are
  -- recreated every run, so stale cache rows would raise IDEMPOTENCY_CONFLICT.
  DELETE FROM public.admin_rpc_idempotency WHERE idempotency_key LIKE 'fixture:%';
  DELETE FROM public.partner_applications WHERE user_id IN (partner_a, partner_b);
  -- accepted_by_user_id has no cascade, so acceptances go before the profiles.
  DELETE FROM public.partner_agreement_acceptances WHERE accepted_by_user_id IN (partner_a, partner_b);
  DELETE FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b);
  DELETE FROM public.admin_roles WHERE user_id = staff_id;
  -- rc.5 audits intake, agreement acceptance, fixtures and activation, all of
  -- which pin profiles rows a re-run needs to drop.
  DELETE FROM public.audit_logs WHERE user_id IN (staff_id, partner_a, partner_b, customer_id);
  DELETE FROM public.profiles WHERE id IN (staff_id, partner_a, partner_b, customer_id);
  DELETE FROM auth.users WHERE id IN (staff_id, partner_a, partner_b, customer_id);

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (staff_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff.partner.fixture@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner.a.fixture@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner.b.fixture@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer.fixture@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW());

  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES
    (staff_id, 'staff.partner.fixture@example.invalid', 'Staff Fixture', TRUE),
    (partner_a, 'partner.a.fixture@example.invalid', 'Partner A', TRUE),
    (partner_b, 'partner.b.fixture@example.invalid', 'Partner B', TRUE),
    (customer_id, 'customer.fixture@example.invalid', 'Customer', TRUE)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = TRUE;

  INSERT INTO public.admin_roles (user_id, role)
  VALUES (staff_id, 'ADMIN')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
`);

  // Scenario 4: partner A (BUSINESS) submits a typed application; staff approves
  const appA = asUser(
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    `SELECT public.submit_partner_application('BUSINESS','Partner A BV','Partner A','partner.a.fixture@example.invalid','12345678',NULL,NULL)`,
  );
  assert(!!appA, "scenario4: application id missing");
  const partnerAId = driveToActive(
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    appA,
    "PARTNERA",
    "BUSINESS",
  );
  assert(!!partnerAId, "scenario5 prep: partner A id");

  // Partner B (INDIVIDUAL) — no company details, no KvK
  const appB = asUser(
    "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    `SELECT public.submit_partner_application('INDIVIDUAL','Partner B','Partner B','partner.b.fixture@example.invalid')`,
  );
  const partnerBId = driveToActive(
    "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    appB,
    "PARTNERB",
    "INDIVIDUAL",
  );

  // Scenario 4: create lead.
  // 20260728210000 added an 8-arg create_partner_lead next to the 7-arg compat
  // wrapper. Because the 8th argument has a default, any call with 7 or fewer
  // arguments matches both candidates and Postgres refuses to choose, so all
  // eight arguments are always supplied here.
  const leadA = asUser(
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    `SELECT public.create_partner_lead('Lead A','lead.a@example.invalid','dedupe-a','Co A',NULL,'hello','PARTNERA',NULL::uuid)`,
  );
  const leadB = asUser(
    "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    `SELECT public.create_partner_lead('Lead B','lead.b@example.invalid','dedupe-b',NULL,NULL,NULL,NULL,NULL::uuid)`,
  );
  assert(!!leadA && !!leadB, "scenario4 leads");
  console.log("SCENARIO 4: PASS");

  // Scenario 5: staff reviews lead
  psql(`
SELECT public.review_partner_lead('${leadA}'::uuid, 'IN_REVIEW'::public.partner_lead_status, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  const leadStatus = psql(`SELECT status::text FROM public.partner_leads WHERE id = '${leadA}'::uuid;`);
  assert(leadStatus === "IN_REVIEW", `scenario5 status=${leadStatus}`);
  console.log("SCENARIO 5: PASS");

  // Scenario 6 + 8: confirm sale → one commission
  const saleId = psql(`
SELECT public.confirm_partner_sale('${leadA}'::uuid, 100000, 'fixture:sale-a', 1000, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  // idempotent retry
  const saleId2 = psql(`
SELECT public.confirm_partner_sale('${leadA}'::uuid, 100000, 'fixture:sale-a', 1000, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  assert(saleId === saleId2, "idempotent sale");
  const saleStatus = psql(`SELECT status::text FROM public.partner_sales WHERE id = '${saleId}'::uuid;`);
  const leadConv = psql(`SELECT status::text FROM public.partner_leads WHERE id = '${leadA}'::uuid;`);
  assert(saleStatus === "SETTLED" && leadConv === "CONVERTED", "scenario6 status sync");
  const commCount = psql(`SELECT COUNT(*)::text FROM public.partner_commissions WHERE partner_sale_id = '${saleId}'::uuid;`);
  assert(commCount === "1", `one commission got ${commCount}`);
  console.log("SCENARIO 6: PASS");
  console.log("SCENARIO 8: PASS");

  // Balanced ledger
  const unbalanced = psql(`
SELECT COUNT(*)::text FROM (
  SELECT t.id FROM public.partner_ledger_transactions t
  JOIN public.partner_ledger_entries e ON e.transaction_id = t.id
  GROUP BY t.id
  HAVING SUM(e.debit_cents) <> SUM(e.credit_cents)
) x;
`);
  assert(unbalanced === "0", "ledger unbalanced");

  // rc.4 moved the commission accrual out of confirm_partner_sale: a sale now
  // leaves the commission PENDING and approve_partner_commission posts the
  // liability, so the payout scenario needs an explicit approval first.
  const commissionId = psql(
    `SELECT id FROM public.partner_commissions WHERE partner_sale_id = '${saleId}'::uuid;`,
  );
  const approved = asUserAal2(
    STAFF,
    `SELECT public.approve_partner_commission('${commissionId}'::uuid, 'fixture commission approval', 'fixture:comm-approve-a');`,
  );
  assert(approved.includes("approved"), `commission approval: ${approved}`);
  console.log("SCENARIO 7 COMMISSION APPROVAL: PASS");

  // Scenario 9: payout — rc.2 fail-closed flags default OFF; enable only for synthetic fixtures.
  psql(`
UPDATE public.feature_flags
SET enabled = true, updated_at = now()
WHERE key IN ('partner_payouts', 'partner.payouts');
`);
  const avail = Number(psql(`SELECT public.partner_available_liability_cents('${partnerAId}'::uuid);`));
  assert(avail === 10000, `expected 10000 commission got ${avail}`);
  const reqId = psql(`
SELECT public.request_partner_payout(10000, 'fixture:payout-req-a', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',true)) s;
`);
  const payoutId = psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  psql(`
SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-1', 'fixture:payout-paid-a')
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  const payoutStatus = psql(`SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`);
  assert(payoutStatus === "PAID", "payout paid");
  const availAfter = Number(psql(`SELECT public.partner_available_liability_cents('${partnerAId}'::uuid);`));
  assert(availAfter === 0, `available after payout ${availAfter}`);

  // Double payout blocked
  let doubleBlocked = false;
  try {
    psql(`
SELECT public.request_partner_payout(10000, 'fixture:payout-req-a2', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',true)) s;
`);
  } catch {
    doubleBlocked = true;
  }
  assert(doubleBlocked, "double payout must fail");

  // Refund after payout — paid status immutable
  psql(`
SELECT public.process_partner_refund_adjustment('${partnerAId}'::uuid, 10000, 'refund after payout', 'partner_sale', '${saleId}'::uuid, '${payoutId}'::uuid, 'fixture:refund-adj', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);
  const stillPaid = psql(`SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`);
  assert(stillPaid === "PAID", "paid payout immutable");
  // Restore fail-closed defaults after synthetic payout fixtures
  psql(`
UPDATE public.feature_flags
SET enabled = false, updated_at = now()
WHERE key IN ('partner_payouts', 'partner.payouts');
`);
  console.log("SCENARIO 9: PASS");

  // Cash receipt
  psql(`
SELECT public.record_partner_cash_receipt(5000, 'fixture:cash-1', NULL, 'bank', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',true)) s;
`);

  // Scenario 10 RLS: set role and jwt
  const rlsA = psql(`
SELECT set_config('role','authenticated',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',true);
SELECT COUNT(*)::text FROM public.partner_leads WHERE partner_id = '${partnerBId}'::uuid;
`);
  const rlsACount = rlsA.split("\n").pop();
  assert(rlsACount === "0", `partner A must not see B leads, got ${rlsACount}`);

  const rlsB = psql(`
SELECT set_config('role','authenticated',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-cccc-cccc-ccccccccccc1',true);
SELECT COUNT(*)::text FROM public.partner_leads WHERE id = '${leadA}'::uuid;
`);
  const rlsBCount = rlsB.split("\n").pop();
  assert(rlsBCount === "0", `partner B must not see A lead`);

  const rlsCust = psql(`
SELECT set_config('role','authenticated',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','dddddddd-dddd-dddd-dddd-ddddddddddd1',true);
SELECT COUNT(*)::text FROM public.partner_commissions;
`);
  assert(rlsCust.split("\n").pop() === "0", "customer denied commissions");

  const rlsAnonDenied = (() => {
    try {
      const rlsAnon = psql(`
SELECT set_config('role','anon',true);
SELECT COUNT(*)::text FROM public.partner_profiles;
`);
      return rlsAnon.split("\n").pop() === "0";
    } catch (e) {
      const msg = String(e);
      return msg.includes("permission denied");
    }
  })();
  assert(rlsAnonDenied, "anon denied profiles");

  // Reset role
  psql(`SELECT set_config('role','postgres',true);`);
  console.log("SCENARIO 10 RLS: PASS");
  console.log("RLS TESTS: PASS (isolation + customer + anon)");

  // Checksums artifact
  const migrations = [
    "20260722100000_partner_identity_roles.sql",
    "20260722110000_partner_applications_profiles_codes.sql",
    "20260722120000_partner_leads_and_sales.sql",
    "20260722130000_partner_commissions_and_ledger.sql",
    "20260722140000_partner_payouts.sql",
    "20260722150000_partner_cash_receipts_adjustments.sql",
    "20260722160000_partner_rls_and_rpcs.sql",
    "20260722170000_partner_verify_contracts.sql",
  ];
  const manifest: Record<string, string> = {
    contractVersion: "vdb-backend-contract@0.2.0-rc.1",
    schemaVersion: "2026.07.22.partner-rc1",
  };
  for (const m of migrations) {
    const p = resolve("supabase/migrations", m);
    manifest[m] = sha256(readFileSync(p, "utf8"));
  }
  mkdirSync(resolve("docs/artifacts"), { recursive: true });
  writeFileSync(
    resolve("docs/artifacts/partner-backend-contract-checksums.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log("FINANCIAL INTEGRITY: PASS");
  console.log("RESULT: PASS");
}

main().catch((e) => {
  console.error("RESULT: FAIL", e);
  process.exit(1);
});
