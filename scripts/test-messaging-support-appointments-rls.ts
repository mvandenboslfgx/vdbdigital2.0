/**
 * Multi-user RLS + RPC tests for messaging/support/appointments rc.3.
 * Local only: supabase_db_vdbdigital2.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTAINER = "supabase_db_vdbdigital2";

const STAFF = "a1111111-1111-1111-1111-111111111111";
const CUST_A = "a2222222-2222-2222-2222-222222222222";
const CUST_B = "a3333333-3333-3333-3333-333333333333";
const PARTNER_A = "a4444444-4444-4444-4444-444444444444";
const PARTNER_B = "a5555555-5555-5555-5555-555555555555";
const ORG_A = "b1111111-1111-1111-1111-111111111111";
const ORG_B = "b2222222-2222-2222-2222-222222222222";

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

function asUser(userId: string, sql: string): string {
  return psql(`
SELECT set_config('role','authenticated',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','${userId}',true);
${sql}
`);
}

function rpcAs(userId: string, sql: string): string {
  return psql(`
SELECT set_config('request.jwt.claim.sub','${userId}',true);
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
    const msg = String(e);
    expectOk(name, msg.includes(code), msg.slice(0, 200));
  }
}

function lastUuid(out: string): string {
  const matches = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  return matches?.[matches.length - 1] ?? "";
}

function lastLine(out: string): string {
  const lines = out.split("\n").filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

function setupFixtures() {
  psql(`
DO $$
DECLARE
  staff_id uuid := '${STAFF}';
  cust_a uuid := '${CUST_A}';
  cust_b uuid := '${CUST_B}';
  partner_a uuid := '${PARTNER_A}';
  partner_b uuid := '${PARTNER_B}';
  org_a uuid := '${ORG_A}';
  org_b uuid := '${ORG_B}';
BEGIN
  -- Cleanup prior fixtures (children first)
  DELETE FROM public.portal_appointment_participants WHERE appointment_id IN (
    SELECT id FROM public.portal_appointments WHERE organization_id IN (org_a, org_b)
  );
  DELETE FROM public.portal_appointments WHERE organization_id IN (org_a, org_b);
  DELETE FROM public.portal_message_attachments WHERE message_id IN (
    SELECT m.id FROM public.portal_messages m
    JOIN public.portal_conversations c ON c.id = m.conversation_id
    WHERE c.organization_id IN (org_a, org_b)
  );
  DELETE FROM public.portal_messages WHERE conversation_id IN (
    SELECT id FROM public.portal_conversations WHERE organization_id IN (org_a, org_b)
  );
  DELETE FROM public.portal_conversation_participants WHERE conversation_id IN (
    SELECT id FROM public.portal_conversations WHERE organization_id IN (org_a, org_b)
  );
  DELETE FROM public.portal_conversations WHERE organization_id IN (org_a, org_b);
  DELETE FROM public.portal_support_replies WHERE ticket_id IN (
    SELECT id FROM public.portal_support_tickets WHERE organization_id IN (org_a, org_b)
  );
  DELETE FROM public.portal_support_tickets WHERE organization_id IN (org_a, org_b);
  DELETE FROM public.organization_members WHERE organization_id IN (org_a, org_b);
  DELETE FROM public.organizations WHERE id IN (org_a, org_b);
  DELETE FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b);
  DELETE FROM public.admin_roles WHERE user_id = staff_id;
  DELETE FROM public.audit_logs WHERE user_id IN (staff_id, cust_a, cust_b, partner_a, partner_b);
  DELETE FROM public.profiles WHERE id IN (staff_id, cust_a, cust_b, partner_a, partner_b);
  DELETE FROM auth.users WHERE id IN (staff_id, cust_a, cust_b, partner_a, partner_b);

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (staff_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'msa.staff@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (cust_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'msa.cust.a@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (cust_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'msa.cust.b@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'msa.partner.a@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'msa.partner.b@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW());

  INSERT INTO public.profiles (id, email, full_name, is_active) VALUES
    (staff_id, 'msa.staff@example.invalid', 'MSA Staff', TRUE),
    (cust_a, 'msa.cust.a@example.invalid', 'MSA Cust A', TRUE),
    (cust_b, 'msa.cust.b@example.invalid', 'MSA Cust B', TRUE),
    (partner_a, 'msa.partner.a@example.invalid', 'MSA Partner A', TRUE),
    (partner_b, 'msa.partner.b@example.invalid', 'MSA Partner B', TRUE)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = TRUE;

  INSERT INTO public.admin_roles (user_id, role) VALUES (staff_id, 'ADMIN')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.organizations (id, legal_name, trade_name, status)
  VALUES
    (org_a, 'MSA Org A', 'Org A', 'ACTIVE'),
    (org_b, 'MSA Org B', 'Org B', 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organization_members (organization_id, user_id, customer_role)
  VALUES
    (org_a, cust_a, 'PRIMARY'),
    (org_a, cust_b, 'MEMBER'),
    (org_b, cust_b, 'PRIMARY')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.partner_profiles (user_id, display_name, status)
  SELECT partner_a, 'Partner A MSA', 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_profiles WHERE user_id = partner_a);
  INSERT INTO public.partner_profiles (user_id, display_name, status)
  SELECT partner_b, 'Partner B MSA', 'ACTIVE'
  WHERE NOT EXISTS (SELECT 1 FROM public.partner_profiles WHERE user_id = partner_b);
END $$;
`);
}

async function main() {
  console.log("=== Messaging/Support/Appointments RLS+RPC tests ===");

  const running = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  if (!running.includes(CONTAINER)) {
    throw new Error(`Local container ${CONTAINER} not running`);
  }

  setupFixtures();

  // --- Messaging happy path ---
  const convId = lastUuid(
    rpcAs(
      CUST_A,
      `SELECT public.create_portal_conversation('${ORG_A}'::uuid, 'Hello A', 'PROJECT'::public.portal_conversation_type, NULL, NULL, ARRAY['${CUST_A}'::uuid]::uuid[]);`,
    ),
  );
  expectOk("rpc:create_portal_conversation", !!convId && convId.length === 36, convId);

  const msgId = lastUuid(
    rpcAs(CUST_A, `SELECT public.send_portal_message('${convId}'::uuid, 'hi', 'idem-1', 'client-1', false);`),
  );
  expectOk("rpc:send_portal_message", !!msgId && msgId.length === 36, msgId);

  const msgIdem = lastUuid(
    rpcAs(CUST_A, `SELECT public.send_portal_message('${convId}'::uuid, 'hi', 'idem-1', 'client-1', false);`),
  );
  expectOk("rpc:send_portal_message_idempotent", msgIdem === msgId, `${msgIdem} vs ${msgId}`);

  rpcAs(CUST_A, `SELECT public.mark_portal_conversation_read('${convId}'::uuid, NOW());`);
  const readAt = psql(
    `SELECT (last_read_at IS NOT NULL)::text FROM public.portal_conversation_participants WHERE conversation_id='${convId}' AND user_id='${CUST_A}';`,
  );
  expectOk("rpc:mark_portal_conversation_read", readAt === "true");

  // Org member B is member of org A but NOT participant → cannot see conversation (participant hardening)
  const seeAsB = lastLine(
    asUser(CUST_B, `SELECT COUNT(*)::text FROM public.portal_conversations WHERE id='${convId}'::uuid;`),
  );
  expectOk("rls:non_participant_org_member_denied", seeAsB === "0", seeAsB);

  // Add B as participant → can see
  rpcAs(CUST_A, `SELECT public.manage_portal_conversation_participant('${convId}'::uuid, '${CUST_B}'::uuid, 'add', 'MEMBER');`);
  const seeAsB2 = lastLine(
    asUser(CUST_B, `SELECT COUNT(*)::text FROM public.portal_conversations WHERE id='${convId}'::uuid;`),
  );
  expectOk("rls:participant_can_select", seeAsB2 === "1", seeAsB2);

  // Remove B → denied again
  rpcAs(CUST_A, `SELECT public.manage_portal_conversation_participant('${convId}'::uuid, '${CUST_B}'::uuid, 'remove', 'MEMBER');`);
  const seeAsB3 = lastLine(
    asUser(CUST_B, `SELECT COUNT(*)::text FROM public.portal_conversations WHERE id='${convId}'::uuid;`),
  );
  expectOk("rls:removed_participant_denied", seeAsB3 === "0", seeAsB3);

  // Non-participant send denied
  expectThrows(
    "rpc:send_not_participant",
    () => {
      rpcAs(CUST_B, `SELECT public.send_portal_message('${convId}'::uuid, 'nope', NULL, NULL, false);`);
    },
    "NOT_PARTICIPANT",
  );

  // Customer cannot create INTERNAL
  expectThrows(
    "rpc:create_internal_forbidden",
    () => {
      rpcAs(
        CUST_A,
        `SELECT public.create_portal_conversation('${ORG_A}'::uuid, 'secret', 'INTERNAL'::public.portal_conversation_type);`,
      );
    },
    "FORBIDDEN",
  );

  // Staff creates INTERNAL + internal message; customer cannot see
  const internalConv = lastUuid(
    rpcAs(
      STAFF,
      `SELECT public.create_portal_conversation('${ORG_A}'::uuid, 'internal', 'INTERNAL'::public.portal_conversation_type, NULL, NULL, ARRAY['${STAFF}'::uuid]::uuid[]);`,
    ),
  );
  rpcAs(STAFF, `SELECT public.send_portal_message('${internalConv}'::uuid, 'staff only', NULL, NULL, true);`);
  const custSeesInternal = lastLine(
    asUser(CUST_A, `SELECT COUNT(*)::text FROM public.portal_conversations WHERE id='${internalConv}'::uuid;`),
  );
  expectOk("rls:internal_conversation_staff_only", custSeesInternal === "0", custSeesInternal);

  // Customer cannot send is_internal
  rpcAs(CUST_A, `SELECT public.manage_portal_conversation_participant('${convId}'::uuid, '${CUST_A}'::uuid, 'add', 'OWNER');`);
  expectThrows(
    "rpc:internal_message_leak_denied",
    () => {
      rpcAs(CUST_A, `SELECT public.send_portal_message('${convId}'::uuid, 'leak', NULL, NULL, true);`);
    },
    "INTERNAL_LEAK_DENIED",
  );

  // Partner B cannot see org A conversation
  const partnerSees = lastLine(
    asUser(PARTNER_B, `SELECT COUNT(*)::text FROM public.portal_conversations WHERE id='${convId}'::uuid;`),
  );
  expectOk("rls:partner_b_denied_org_a_conversation", partnerSees === "0", partnerSees);

  // --- Support ---
  const ticketId = lastUuid(psql(`
INSERT INTO public.portal_support_tickets (
  organization_id, ticket_number, created_by, subject, description, status
) VALUES (
  '${ORG_A}', 'MSA-T-1', '${CUST_A}', 'Help', 'Need help', 'NEW'
) RETURNING id::text;
`));
  expectOk("fixture:support_ticket_default_new", !!ticketId);

  expectThrows(
    "rpc:assign_non_staff_forbidden",
    () => {
      rpcAs(CUST_A, `SELECT public.assign_portal_support_ticket('${ticketId}'::uuid, '${STAFF}'::uuid);`);
    },
    "FORBIDDEN",
  );

  rpcAs(STAFF, `SELECT public.assign_portal_support_ticket('${ticketId}'::uuid, '${STAFF}'::uuid);`);
  const assigned = psql(`SELECT assigned_to::text FROM public.portal_support_tickets WHERE id='${ticketId}'::uuid;`);
  expectOk("rpc:assign_portal_support_ticket", assigned === STAFF, assigned);

  const replyId = lastUuid(
    rpcAs(CUST_A, `SELECT public.reply_portal_support_ticket('${ticketId}'::uuid, 'customer reply');`),
  );
  expectOk("rpc:reply_portal_support_ticket", !!replyId && replyId.length === 36, replyId);

  // Internal note requires flag — still false → FEATURE_DISABLED
  expectThrows(
    "rpc:internal_note_flag_disabled",
    () => {
      rpcAs(STAFF, `SELECT public.add_portal_support_internal_note('${ticketId}'::uuid, 'secret note');`);
    },
    "FEATURE_DISABLED",
  );

  psql(`UPDATE public.feature_flags SET enabled=true WHERE key='support_internal_notes_rpc';`);
  const noteId = lastUuid(
    rpcAs(STAFF, `SELECT public.add_portal_support_internal_note('${ticketId}'::uuid, 'secret note');`),
  );
  expectOk("rpc:add_portal_support_internal_note", !!noteId && noteId.length === 36, noteId);

  const custSeesNote = lastLine(
    asUser(
      CUST_A,
      `SELECT COUNT(*)::text FROM public.portal_support_replies WHERE id='${noteId}'::uuid;`,
    ),
  );
  expectOk("rls:internal_support_note_hidden_from_customer", custSeesNote === "0", custSeesNote);

  const staffSeesNote = lastLine(
    asUser(STAFF, `SELECT COUNT(*)::text FROM public.portal_support_replies WHERE id='${noteId}'::uuid;`),
  );
  expectOk("rls:internal_support_note_visible_to_staff", staffSeesNote === "1", staffSeesNote);

  psql(`UPDATE public.feature_flags SET enabled=false WHERE key='support_internal_notes_rpc';`);

  rpcAs(
    STAFF,
    `SELECT public.transition_portal_support_ticket_status('${ticketId}'::uuid, 'IN_PROGRESS'::public.portal_ticket_status);`,
  );
  const st = psql(`SELECT status::text FROM public.portal_support_tickets WHERE id='${ticketId}';`);
  expectOk("rpc:transition_portal_support_ticket_status", st === "IN_PROGRESS", st);

  expectThrows(
    "rpc:invalid_transition",
    () => {
      rpcAs(
        STAFF,
        `SELECT public.transition_portal_support_ticket_status('${ticketId}'::uuid, 'NEW'::public.portal_ticket_status);`,
      );
    },
    "INVALID_TRANSITION",
  );

  // Org membership is used for tickets; partner (non-member) must not see org A ticket
  const partnerTicket = lastLine(
    asUser(PARTNER_A, `SELECT COUNT(*)::text FROM public.portal_support_tickets WHERE id='${ticketId}'::uuid;`),
  );
  expectOk("rls:partner_denied_support_ticket", partnerTicket === "0", partnerTicket);

  // --- Appointments ---
  psql(`UPDATE public.feature_flags SET enabled=false WHERE key='appointments_booking';`);
  expectThrows(
    "rpc:book_flag_disabled",
    () => {
      rpcAs(
        CUST_A,
        `SELECT public.book_portal_appointment('${ORG_A}'::uuid, 'Kickoff', NOW() + interval '1 day', NOW() + interval '1 day' + interval '1 hour');`,
      );
    },
    "FEATURE_DISABLED",
  );

  psql(`UPDATE public.feature_flags SET enabled=true WHERE key='appointments_booking';`);

  const appt1 = lastUuid(
    rpcAs(
      CUST_A,
      `SELECT public.book_portal_appointment(
        '${ORG_A}'::uuid, 'Kickoff',
        '2030-01-10T10:00:00Z'::timestamptz,
        '2030-01-10T11:00:00Z'::timestamptz,
        'UTC', 'KICKOFF'::public.portal_appointment_type
      );`,
    ),
  );
  expectOk("rpc:book_portal_appointment", !!appt1 && appt1.length === 36, appt1);

  expectThrows(
    "rpc:double_booking",
    () => {
      rpcAs(
        CUST_A,
        `SELECT public.book_portal_appointment(
          '${ORG_A}'::uuid, 'Overlap',
          '2030-01-10T10:30:00Z'::timestamptz,
          '2030-01-10T11:30:00Z'::timestamptz
        );`,
      );
    },
    "DOUBLE_BOOKING",
  );

  rpcAs(
    CUST_A,
    `SELECT public.reschedule_portal_appointment(
      '${appt1}'::uuid,
      '2030-01-11T10:00:00Z'::timestamptz,
      '2030-01-11T11:00:00Z'::timestamptz
    );`,
  );
  const apptStatus = psql(`SELECT status::text FROM public.portal_appointments WHERE id='${appt1}';`);
  expectOk("rpc:reschedule_portal_appointment", apptStatus === "RESCHEDULED", apptStatus);

  // Wrong org actor (partner) forbidden
  expectThrows(
    "rpc:cancel_wrong_role",
    () => {
      rpcAs(PARTNER_A, `SELECT public.cancel_portal_appointment('${appt1}'::uuid, 'nope');`);
    },
    "FORBIDDEN",
  );

  rpcAs(CUST_A, `SELECT public.cancel_portal_appointment('${appt1}'::uuid, 'changed plans');`);
  const cancelled = psql(`SELECT status::text FROM public.portal_appointments WHERE id='${appt1}';`);
  expectOk("rpc:cancel_portal_appointment", cancelled === "CANCELLED", cancelled);

  // Org B customer cannot see org A appointment after cancel still ownership RLS — cust_b is org_a member so can see.
  // Use partner_b as non-member non-participant.
  const partnerAppt = lastLine(
    asUser(PARTNER_B, `SELECT COUNT(*)::text FROM public.portal_appointments WHERE id='${appt1}'::uuid;`),
  );
  expectOk("rls:partner_b_denied_appointment", partnerAppt === "0", partnerAppt);

  psql(`UPDATE public.feature_flags SET enabled=false WHERE key='appointments_booking';`);

  // Reset role
  psql(`SELECT set_config('role','postgres',true);`);

  // Contract verifier still green (flags fail-closed)
  const verifyFail = psql(
    `SELECT check_name FROM public.verify_messaging_support_appointments_contracts() WHERE ok IS NOT TRUE;`,
  );
  expectOk("verify_messaging_support_appointments_contracts", verifyFail === "", verifyFail);

  // rc.2 surfaces
  const rc2Missing = psql(`
SELECT string_agg(n, ',') FROM (VALUES
  ('portal_projects'),('portal_quotes'),('portal_invoices'),('portal_files'),('partner_commissions')
) v(n) WHERE to_regclass('public.'||n) IS NULL;
`);
  expectOk("rc2_surfaces_intact", rc2Missing === "", rc2Missing);

  mkdirSync(resolve("docs/artifacts"), { recursive: true });
  writeFileSync(
    resolve("docs/artifacts/messaging-support-appointments-rls-rpc-results.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        passed,
        failed,
        total: passed + failed,
        results,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\nTOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
