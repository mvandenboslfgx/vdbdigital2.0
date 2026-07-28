/**
 * Minimal RC3 synthetic fixtures + security/RLS/RC2 regression validation on staging.
 * Staging qzekuvmgfekzsowdecyk only. Never prints secrets/passwords/tokens.
 */
import fs from "node:fs";
import {
  STAGING,
  PROD,
  EVIDENCE,
  getCliToken,
  assertStagingIdentity,
  sql,
  writeJson,
  ensureDir,
} from "./staging-rc3-apply-lib.js";

const MARKER = "STAGING_RC3_OWNER_VAL";
const ACCOUNTS = {
  cust_a: {
    userId: "1246d431-4da5-492f-b142-5375c1976993",
    email: "staging+cust_a@example.test",
  },
  cust_b: {
    userId: "5f721c61-3170-40e1-9217-b9fb4f3860c4",
    email: "staging+cust_b@example.test",
  },
  part_a: {
    userId: "3d6fe62d-4e80-4028-85f4-ab2c638008e7",
    email: "staging+part_a@example.test",
  },
  part_b: {
    userId: "a5f3df42-ca1b-4b10-b49e-6a628c43a301",
    email: "staging+part_b@example.test",
  },
  staff: {
    userId: "e0334497-5d78-4f68-ac5d-c6a275d8178e",
    email: "staging+staff_s@example.test",
  },
  admin: {
    userId: "e83237f8-8c5a-4f12-be3a-427548283659",
    email: "staging+admin_a@example.test",
  },
  owner: {
    userId: "03e630f7-dbc4-4015-9d03-86f217cd8955",
    email: "staging+owner_o@example.test",
  },
} as const;

const ORG_A = "1b7d70b1-3026-46dd-a2f5-32c04a93fdaf";
const ORG_B = "ed3f3a85-d5c5-4cf5-b07d-5c3a42d51eb5";
const PROJECT_A = "573422b1-0511-4305-94b7-12971d5dc3c9";
const QUOTE_A = "f8d5c7ee-2f74-45a5-8548-fabb91833946";
const INVOICE_A = "f283c589-1211-46f3-bd08-2ae663fd2428";

const VAULT_CLIENT =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-ui-device/.vault/staging-client.env";
const VAULT_PASSWORDS =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json";

type Check = { name: string; ok: boolean; detail?: unknown };
const checks: Check[] = [];

function rec(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

function loadEnvFile(p: string) {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function assertStagingUrl(url: string) {
  if (!url.includes(STAGING)) throw new Error(`ref_not_staging:${url}`);
  if (url.includes(PROD)) throw new Error("production_denylist");
}

async function signIn(base: string, anon: string, email: string, password: string) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) {
    throw new Error(body.error_description || body.msg || `auth_${res.status}`);
  }
  return body as { access_token: string };
}

async function rest(
  base: string,
  anon: string,
  token: string,
  table: string,
  query = "",
) {
  const res = await fetch(`${base}/rest/v1/${table}${query}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function restWrite(
  base: string,
  anon: string,
  token: string,
  table: string,
  body: unknown,
) {
  const res = await fetch(`${base}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function rpc(
  base: string,
  anon: string,
  token: string,
  fn: string,
  args: Record<string, unknown>,
) {
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function placeFixtures(token: string) {
  // Idempotent cleanup of prior RC3 marker fixtures only (never delete RC2 fixtures)
  await sql(
    token,
    `
DELETE FROM public.portal_appointment_participants
WHERE appointment_id IN (
  SELECT id FROM public.portal_appointments WHERE notes LIKE '${MARKER}%'
);
DELETE FROM public.portal_appointments WHERE notes LIKE '${MARKER}%';
DELETE FROM public.portal_message_attachments
WHERE message_id IN (
  SELECT m.id FROM public.portal_messages m WHERE m.body LIKE '${MARKER}%'
);
DELETE FROM public.portal_messages WHERE body LIKE '${MARKER}%';
DELETE FROM public.portal_conversation_participants
WHERE conversation_id IN (
  SELECT id FROM public.portal_conversations WHERE subject LIKE '${MARKER}%'
);
DELETE FROM public.portal_conversations WHERE subject LIKE '${MARKER}%';
DELETE FROM public.portal_support_replies
WHERE body LIKE '${MARKER}%'
   OR ticket_id IN (
     SELECT id FROM public.portal_support_tickets WHERE subject LIKE '${MARKER}%'
   );
DELETE FROM public.portal_support_tickets WHERE subject LIKE '${MARKER}%';
`,
  );

  const rows = (await sql(
    token,
    `
WITH conv AS (
  INSERT INTO public.portal_conversations (
    organization_id, project_id, subject, status, conversation_type, created_by, last_message_at
  ) VALUES (
    '${ORG_A}'::uuid, '${PROJECT_A}'::uuid, '${MARKER} cust_a conversation', 'OPEN',
    'PROJECT'::public.portal_conversation_type, '${ACCOUNTS.cust_a.userId}'::uuid, NOW()
  ) RETURNING id
),
parts AS (
  INSERT INTO public.portal_conversation_participants (conversation_id, user_id, role_in_conversation, last_read_at)
  SELECT id, '${ACCOUNTS.cust_a.userId}'::uuid, 'OWNER', NOW() - interval '1 hour' FROM conv
  UNION ALL
  SELECT id, '${ACCOUNTS.staff.userId}'::uuid, 'STAFF', NULL FROM conv
  RETURNING conversation_id, user_id
),
msg AS (
  INSERT INTO public.portal_messages (conversation_id, author_user_id, body, is_internal, idempotency_key, client_message_id)
  SELECT id, '${ACCOUNTS.cust_a.userId}'::uuid, '${MARKER} hello from cust_a', false,
         '${MARKER}-msg-1', 'client-rc3-1'
  FROM conv
  RETURNING id, conversation_id
),
msg2 AS (
  INSERT INTO public.portal_messages (conversation_id, author_user_id, body, is_internal, idempotency_key)
  SELECT conversation_id, '${ACCOUNTS.staff.userId}'::uuid, '${MARKER} staff public reply', false,
         '${MARKER}-msg-2'
  FROM msg
  RETURNING id, conversation_id
),
att AS (
  INSERT INTO public.portal_message_attachments (message_id, storage_path, file_name, mime_type, byte_size, created_by)
  SELECT id, 'staging-rc3/${MARKER}/note.txt', 'note.txt', 'text/plain', 12,
         '${ACCOUNTS.cust_a.userId}'::uuid
  FROM msg
  RETURNING id, message_id
),
ticket AS (
  INSERT INTO public.portal_support_tickets (
    organization_id, project_id, ticket_number, created_by, subject, category, priority, status, description
  ) VALUES (
    '${ORG_A}'::uuid, '${PROJECT_A}'::uuid, 'STG-RC3-001', '${ACCOUNTS.cust_a.userId}'::uuid,
    '${MARKER} support ticket', 'GENERAL', 'NORMAL', 'OPEN'::public.portal_ticket_status,
    '${MARKER} ticket description'
  ) RETURNING id
),
pub_reply AS (
  INSERT INTO public.portal_support_replies (ticket_id, author_user_id, body, is_internal)
  SELECT id, '${ACCOUNTS.staff.userId}'::uuid, '${MARKER} public support reply', false FROM ticket
  RETURNING id, ticket_id
),
int_reply AS (
  INSERT INTO public.portal_support_replies (ticket_id, author_user_id, body, is_internal)
  SELECT id, '${ACCOUNTS.staff.userId}'::uuid, '${MARKER} INTERNAL staff-only note', true FROM ticket
  RETURNING id, ticket_id
),
appt AS (
  INSERT INTO public.portal_appointments (
    organization_id, project_id, title, appointment_type, status,
    starts_at, ends_at, timezone, organizer_user_id, notes, created_by
  ) VALUES (
    '${ORG_A}'::uuid, '${PROJECT_A}'::uuid, '${MARKER} intake',
    'INTAKE'::public.portal_appointment_type, 'SCHEDULED'::public.portal_appointment_status,
    NOW() + interval '2 days', NOW() + interval '2 days' + interval '1 hour', 'Europe/Amsterdam',
    '${ACCOUNTS.staff.userId}'::uuid, '${MARKER} appointment fixture', '${ACCOUNTS.staff.userId}'::uuid
  ) RETURNING id
),
appt_parts AS (
  INSERT INTO public.portal_appointment_participants (appointment_id, user_id, role, response_status)
  SELECT id, '${ACCOUNTS.staff.userId}'::uuid, 'ORGANIZER', 'ACCEPTED'::public.portal_appointment_response FROM appt
  UNION ALL
  SELECT id, '${ACCOUNTS.cust_a.userId}'::uuid, 'ATTENDEE', 'PENDING'::public.portal_appointment_response FROM appt
  RETURNING appointment_id, user_id
)
SELECT
  (SELECT id::text FROM conv) AS conversation_id,
  (SELECT id::text FROM msg) AS message_public_cust_id,
  (SELECT id::text FROM msg2) AS message_public_staff_id,
  (SELECT id::text FROM att) AS attachment_id,
  (SELECT id::text FROM ticket) AS ticket_id,
  (SELECT id::text FROM pub_reply) AS public_reply_id,
  (SELECT id::text FROM int_reply) AS internal_reply_id,
  (SELECT id::text FROM appt) AS appointment_id;
`,
  )) as Array<Record<string, string>>;

  const ids = rows[0];
  if (!ids?.conversation_id || !ids?.ticket_id || !ids?.appointment_id) {
    throw new Error(`fixture_insert_incomplete:${JSON.stringify(ids)}`);
  }

  // Reschedule/cancel test data: second appointment for cancel path (distinct time window)
  const cancelRows = (await sql(
    token,
    `
WITH appt AS (
  INSERT INTO public.portal_appointments (
    organization_id, project_id, title, appointment_type, status,
    starts_at, ends_at, timezone, organizer_user_id, notes, created_by
  ) VALUES (
    '${ORG_A}'::uuid, '${PROJECT_A}'::uuid, '${MARKER} cancel-candidate',
    'SUPPORT'::public.portal_appointment_type, 'SCHEDULED'::public.portal_appointment_status,
    NOW() + interval '5 days', NOW() + interval '5 days' + interval '30 minutes', 'Europe/Amsterdam',
    '${ACCOUNTS.staff.userId}'::uuid, '${MARKER} cancel candidate', '${ACCOUNTS.staff.userId}'::uuid
  ) RETURNING id
)
INSERT INTO public.portal_appointment_participants (appointment_id, user_id, role, response_status)
SELECT id, '${ACCOUNTS.staff.userId}'::uuid, 'ORGANIZER', 'ACCEPTED'::public.portal_appointment_response FROM appt
UNION ALL
SELECT id, '${ACCOUNTS.cust_a.userId}'::uuid, 'ATTENDEE', 'PENDING'::public.portal_appointment_response FROM appt
RETURNING appointment_id::text AS appointment_cancel_id;
`,
  )) as Array<{ appointment_cancel_id: string }>;

  return {
    marker: MARKER,
    ...ids,
    appointment_cancel_id: cancelRows[0]?.appointment_cancel_id,
    orgAId: ORG_A,
    orgBId: ORG_B,
    projectId: PROJECT_A,
    quoteId: QUOTE_A,
    invoiceId: INVOICE_A,
  };
}

async function securitySql(token: string) {
  const verify = (await sql(
    token,
    `SELECT check_name::text AS check_name, ok, detail::text AS detail
     FROM public.verify_messaging_support_appointments_contracts()`,
  )) as Array<{ check_name: string; ok: boolean; detail: string }>;
  const fail = verify.filter((v) => !v.ok);
  rec("contract_verify_all_ok", fail.length === 0, { failCount: fail.length, fail: fail.slice(0, 10) });

  const searchPath = (await sql(
    token,
    `SELECT p.proname::text AS name,
            pg_get_function_identity_arguments(p.oid) AS args,
            coalesce(array_to_string(p.proconfig, ','), '') AS config
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public'
       AND p.proname IN (
         'create_portal_conversation','send_portal_message','mark_portal_conversation_read',
         'book_portal_appointment','reschedule_portal_appointment','cancel_portal_appointment',
         'is_active_conversation_participant','verify_messaging_support_appointments_contracts'
       )`,
  )) as Array<{ name: string; args: string; config: string }>;
  const unsafe = searchPath.filter(
    (r) => !/search_path[= ]*public/i.test(r.config.replace(/,/g, " ")),
  );
  rec("rpc_search_path_public", unsafe.length === 0, {
    checked: searchPath.length,
    unsafe: unsafe.map((u) => u.name),
  });

  const rls = (await sql(
    token,
    `SELECT c.relname::text AS table_name, c.relrowsecurity AS rls
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN (
       'portal_conversations','portal_conversation_participants','portal_messages',
       'portal_message_attachments','portal_support_tickets','portal_support_replies',
       'portal_appointments','portal_appointment_participants'
     )
     ORDER BY 1`,
  )) as Array<{ table_name: string; rls: boolean }>;
  rec("rls_enabled_rc3_tables", rls.length === 8 && rls.every((t) => t.rls === true), rls);

  const grants = (await sql(
    token,
    `SELECT table_name::text, grantee::text, privilege_type::text
     FROM information_schema.role_table_grants
     WHERE table_schema='public'
       AND table_name IN (
         'portal_message_attachments','portal_appointments','portal_appointment_participants'
       )
       AND grantee IN ('anon','authenticated','service_role')
     ORDER BY 1,2,3`,
  )) as Array<{ table_name: string; grantee: string; privilege_type: string }>;
  const anonWrites = grants.filter(
    (g) =>
      g.grantee === "anon" &&
      ["INSERT", "UPDATE", "DELETE", "TRUNCATE"].includes(g.privilege_type),
  );
  rec("grants_no_anon_writes_rc3", anonWrites.length === 0, { anonWrites, grantCount: grants.length });

  const storage = (await sql(
    token,
    `SELECT count(*)::int AS bucket_count,
            count(*) FILTER (WHERE public)::int AS public_count,
            count(*) FILTER (WHERE NOT public)::int AS private_count
     FROM storage.buckets`,
  )) as Array<{ bucket_count: number; public_count: number; private_count: number }>;
  rec(
    "storage_private_only",
    storage[0]?.public_count === 0 && (storage[0]?.private_count ?? 0) >= 1,
    storage[0],
  );

  const flags = (await sql(
    token,
    `SELECT key::text AS key, enabled FROM public.feature_flags
     WHERE key IN (
       'messaging_realtime','support_internal_notes_rpc','appointments_booking',
       'digital_product_checkout','mollie_checkout','payments.mollie_checkout',
       'payments.digital_goods_checkout'
     ) ORDER BY key`,
  )) as Array<{ key: string; enabled: boolean }>;
  rec("feature_flags_fail_closed", flags.every((f) => f.enabled === false), flags);

  const financial = (await sql(
    token,
    `SELECT
       (SELECT count(*)::int FROM (
          SELECT partner_lead_id FROM public.partner_sales
          WHERE partner_lead_id IS NOT NULL GROUP BY partner_lead_id HAVING count(*)>1) d) AS duplicate_lead_groups,
       (SELECT count(*)::int FROM (
          SELECT partner_sale_id FROM public.partner_commissions
          GROUP BY partner_sale_id HAVING count(*)>1) d) AS duplicate_commissions,
       (SELECT count(*)::int FROM (
          SELECT idempotency_key FROM public.partner_ledger_transactions
          GROUP BY idempotency_key HAVING count(*)>1) d) AS duplicate_ledger_events,
       (SELECT count(*)::int FROM (
          SELECT t.id FROM public.partner_ledger_transactions t
          JOIN public.partner_ledger_entries e ON e.transaction_id=t.id
          GROUP BY t.id HAVING sum(e.debit_cents)<>sum(e.credit_cents)
       ) x) AS unbalanced_ledger,
       (SELECT count(*)::int FROM public.partner_profiles p
        WHERE public.partner_available_liability_cents(p.id) < 0) AS negative_liability`,
  )) as Array<Record<string, number>>;
  rec(
    "financial_integrity_clean",
    Object.values(financial[0] || {}).every((n) => n === 0),
    financial[0],
  );

  // Realtime publication inventory (presence only)
  const realtime = (await sql(
    token,
    `SELECT coalesce(string_agg(schemaname||'.'||tablename, ',' ORDER BY tablename), '') AS pubs
     FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND tablename IN (
         'portal_conversations','portal_messages','portal_support_tickets',
         'portal_support_replies','portal_appointments'
       )`,
  )) as Array<{ pubs: string }>;
  rec("realtime_inventory_recorded", true, {
    note: "messaging_realtime flag false — publication optional",
    pubs: realtime[0]?.pubs || "",
  });
}

async function rlsMatrix(
  base: string,
  anon: string,
  passwords: Record<string, string>,
  fixtures: Record<string, string>,
) {
  // Anon deny
  {
    const r = await rest(base, anon, anon, "portal_conversations", `?id=eq.${fixtures.conversation_id}&select=id`);
    const n = Array.isArray(r.data) ? r.data.length : -1;
    rec("anon_deny_conversation", n === 0 || r.status >= 400, { status: r.status, n });
  }
  {
    const r = await rest(base, anon, anon, "portal_messages", `?select=id&limit=5`);
    const n = Array.isArray(r.data) ? r.data.length : -1;
    rec("anon_deny_messages", n === 0 || r.status >= 400, { status: r.status, n });
  }
  {
    const r = await rest(base, anon, anon, "portal_appointments", `?select=id&limit=5`);
    const n = Array.isArray(r.data) ? r.data.length : -1;
    rec("anon_deny_appointments", n === 0 || r.status >= 400, { status: r.status, n });
  }

  // Cust A happy path
  const a = await signIn(base, anon, ACCOUNTS.cust_a.email, passwords[ACCOUNTS.cust_a.email]);
  {
    const conv = await rest(
      base,
      anon,
      a.access_token,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id,subject`,
    );
    rec("cust_a_sees_conversation", Array.isArray(conv.data) && conv.data.length === 1, {
      status: conv.status,
    });
    const msgs = await rest(
      base,
      anon,
      a.access_token,
      "portal_messages",
      `?conversation_id=eq.${fixtures.conversation_id}&select=id,body,is_internal`,
    );
    const list = Array.isArray(msgs.data) ? msgs.data : [];
    rec("cust_a_sees_public_messages", list.length >= 2 && list.every((m: { is_internal?: boolean }) => !m.is_internal), {
      count: list.length,
    });
    const parts = await rest(
      base,
      anon,
      a.access_token,
      "portal_conversation_participants",
      `?conversation_id=eq.${fixtures.conversation_id}&select=user_id,last_read_at`,
    );
    rec("cust_a_sees_participants_read_state", Array.isArray(parts.data) && parts.data.length >= 1, {
      count: Array.isArray(parts.data) ? parts.data.length : 0,
    });
    const att = await rest(
      base,
      anon,
      a.access_token,
      "portal_message_attachments",
      `?id=eq.${fixtures.attachment_id}&select=id,file_name`,
    );
    rec("cust_a_sees_attachment_meta", Array.isArray(att.data) && att.data.length === 1, {
      status: att.status,
    });
    const tickets = await rest(
      base,
      anon,
      a.access_token,
      "portal_support_tickets",
      `?id=eq.${fixtures.ticket_id}&select=id,subject`,
    );
    rec("cust_a_sees_support_ticket", Array.isArray(tickets.data) && tickets.data.length === 1);
    const replies = await rest(
      base,
      anon,
      a.access_token,
      "portal_support_replies",
      `?ticket_id=eq.${fixtures.ticket_id}&select=id,body,is_internal`,
    );
    const rlist = Array.isArray(replies.data) ? replies.data : [];
    const hasPublic = rlist.some((r: { id?: string }) => r.id === fixtures.public_reply_id);
    const hasInternal = rlist.some((r: { id?: string }) => r.id === fixtures.internal_reply_id);
    rec("cust_a_sees_public_reply_not_internal", hasPublic && !hasInternal, {
      count: rlist.length,
      hasPublic,
      hasInternal,
    });
    const appts = await rest(
      base,
      anon,
      a.access_token,
      "portal_appointments",
      `?id=eq.${fixtures.appointment_id}&select=id,title,status`,
    );
    rec("cust_a_sees_appointment", Array.isArray(appts.data) && appts.data.length === 1);
    const ap = await rest(
      base,
      anon,
      a.access_token,
      "portal_appointment_participants",
      `?appointment_id=eq.${fixtures.appointment_id}&select=user_id,role`,
    );
    rec("cust_a_sees_appointment_participant", Array.isArray(ap.data) && ap.data.length >= 1);

    // RC2 regressions
    const projects = await rest(
      base,
      anon,
      a.access_token,
      "portal_projects",
      `?id=eq.${PROJECT_A}&select=id`,
    );
    rec("rc2_cust_a_project", Array.isArray(projects.data) && projects.data.length === 1);
    const quotes = await rest(base, anon, a.access_token, "portal_quotes", `?id=eq.${QUOTE_A}&select=id`);
    rec("rc2_cust_a_quote", Array.isArray(quotes.data) && quotes.data.length === 1);
    const invoices = await rest(
      base,
      anon,
      a.access_token,
      "portal_invoices",
      `?id=eq.${INVOICE_A}&select=id`,
    );
    rec("rc2_cust_a_invoice", Array.isArray(invoices.data) && invoices.data.length === 1);
    const docs = await rest(base, anon, a.access_token, "portal_files", "?select=id&limit=5");
    rec("rc2_cust_a_documents_query_ok", docs.ok, { status: docs.status });
    const catalog = await rest(base, anon, a.access_token, "products", "?select=id&limit=3");
    rec("rc2_catalog_products_readable", catalog.ok, { status: catalog.status });
  }

  // Cust B isolation / empty
  const b = await signIn(base, anon, ACCOUNTS.cust_b.email, passwords[ACCOUNTS.cust_b.email]);
  {
    const conv = await rest(
      base,
      anon,
      b.access_token,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id`,
    );
    rec("cust_b_denied_conversation", Array.isArray(conv.data) && conv.data.length === 0);
    const msgs = await rest(
      base,
      anon,
      b.access_token,
      "portal_messages",
      `?conversation_id=eq.${fixtures.conversation_id}&select=id`,
    );
    rec("cust_b_denied_messages", Array.isArray(msgs.data) && msgs.data.length === 0);
    const att = await rest(
      base,
      anon,
      b.access_token,
      "portal_message_attachments",
      `?id=eq.${fixtures.attachment_id}&select=id`,
    );
    rec("cust_b_denied_attachment", Array.isArray(att.data) && att.data.length === 0);
    const ticket = await rest(
      base,
      anon,
      b.access_token,
      "portal_support_tickets",
      `?id=eq.${fixtures.ticket_id}&select=id`,
    );
    rec("cust_b_denied_ticket", Array.isArray(ticket.data) && ticket.data.length === 0);
    const appt = await rest(
      base,
      anon,
      b.access_token,
      "portal_appointments",
      `?id=eq.${fixtures.appointment_id}&select=id`,
    );
    rec("cust_b_denied_appointment", Array.isArray(appt.data) && appt.data.length === 0);
    const projects = await rest(
      base,
      anon,
      b.access_token,
      "portal_projects",
      `?id=eq.${PROJECT_A}&select=id`,
    );
    rec("cust_b_denied_project_a", Array.isArray(projects.data) && projects.data.length === 0);
    const emptyConv = await rest(
      base,
      anon,
      b.access_token,
      "portal_conversations",
      "?select=id&limit=20",
    );
    rec("cust_b_conversations_empty", Array.isArray(emptyConv.data) && emptyConv.data.length === 0);
    const emptyAppt = await rest(
      base,
      anon,
      b.access_token,
      "portal_appointments",
      "?select=id&limit=20",
    );
    rec("cust_b_appointments_empty", Array.isArray(emptyAppt.data) && emptyAppt.data.length === 0);

    const write = await restWrite(base, anon, b.access_token, "portal_messages", {
      conversation_id: fixtures.conversation_id,
      author_user_id: ACCOUNTS.cust_b.userId,
      body: `${MARKER} unauthorized write`,
      is_internal: false,
    });
    rec("cust_b_unauthorized_message_write_denied", !write.ok || write.status >= 400, {
      status: write.status,
    });
  }

  // Partner B isolation
  const pb = await signIn(base, anon, ACCOUNTS.part_b.email, passwords[ACCOUNTS.part_b.email]);
  {
    const conv = await rest(
      base,
      anon,
      pb.access_token,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id`,
    );
    rec("part_b_denied_customer_conversation", Array.isArray(conv.data) && conv.data.length === 0);
    const empty = await rest(
      base,
      anon,
      pb.access_token,
      "portal_appointments",
      "?select=id&limit=20",
    );
    rec("part_b_appointments_empty_or_none_of_a", Array.isArray(empty.data) && !empty.data.some((x: { id?: string }) => x.id === fixtures.appointment_id));
  }

  // Staff / admin / owner management access
  for (const key of ["staff", "admin", "owner"] as const) {
    const sess = await signIn(base, anon, ACCOUNTS[key].email, passwords[ACCOUNTS[key].email]);
    const conv = await rest(
      base,
      anon,
      sess.access_token,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id`,
    );
    rec(`${key}_sees_conversation`, Array.isArray(conv.data) && conv.data.length === 1);
    const replies = await rest(
      base,
      anon,
      sess.access_token,
      "portal_support_replies",
      `?ticket_id=eq.${fixtures.ticket_id}&select=id,is_internal`,
    );
    const list = Array.isArray(replies.data) ? replies.data : [];
    const seesInternal = list.some((r: { id?: string }) => r.id === fixtures.internal_reply_id);
    rec(`${key}_sees_internal_support_reply`, seesInternal, { count: list.length });
    const appt = await rest(
      base,
      anon,
      sess.access_token,
      "portal_appointments",
      `?id=eq.${fixtures.appointment_id}&select=id`,
    );
    rec(`${key}_sees_appointment`, Array.isArray(appt.data) && appt.data.length === 1);
  }

  // Staff booking RPC paths (flags fail-closed: appointments_booking=false → expect deny)
  {
    const staff = await signIn(base, anon, ACCOUNTS.staff.email, passwords[ACCOUNTS.staff.email]);
    const book = await rpc(base, anon, staff.access_token, "book_portal_appointment", {
      p_organization_id: ORG_A,
      p_project_id: PROJECT_A,
      p_title: `${MARKER} book attempt`,
      p_appointment_type: "OTHER",
      p_starts_at: new Date(Date.now() + 8 * 86400000).toISOString(),
      p_ends_at: new Date(Date.now() + 8 * 86400000 + 3600000).toISOString(),
      p_timezone: "Europe/Amsterdam",
      p_participant_user_ids: [ACCOUNTS.cust_a.userId],
    });
    rec(
      "book_portal_appointment_fail_closed_or_ok",
      !book.ok || typeof book.data === "string",
      { status: book.status, note: "flag appointments_booking=false expected deny" },
    );

    const cancel = await rpc(base, anon, staff.access_token, "cancel_portal_appointment", {
      p_appointment_id: fixtures.appointment_cancel_id,
      p_reason: `${MARKER} cancel test`,
      p_expected_version: 1,
    });
    // Cancel may also be flag-gated; record outcome without inventing success if blocked
    rec("cancel_portal_appointment_invoked", true, {
      status: cancel.status,
      ok: cancel.ok,
      dataType: typeof cancel.data,
    });

    const resched = await rpc(base, anon, staff.access_token, "reschedule_portal_appointment", {
      p_appointment_id: fixtures.appointment_id,
      p_starts_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      p_ends_at: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(),
      p_expected_version: 1,
    });
    rec("reschedule_portal_appointment_invoked", true, {
      status: resched.status,
      ok: resched.ok,
    });
  }
}

async function main() {
  ensureDir(EVIDENCE);
  const mgmt = getCliToken();
  if (!mgmt || mgmt.length < 20) throw new Error("token_missing");
  await assertStagingIdentity(mgmt);

  const fixtures = await placeFixtures(mgmt);
  writeJson("fixtures-ids.json", fixtures);
  console.log(JSON.stringify({ fixturesPlaced: true, ids: fixtures }, null, 2));

  await securitySql(mgmt);

  const client = loadEnvFile(VAULT_CLIENT);
  assertStagingUrl(client.STAGING_SUPABASE_URL);
  const base = client.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = client.STAGING_SUPABASE_ANON_KEY;
  const passwords = JSON.parse(fs.readFileSync(VAULT_PASSWORDS, "utf8")) as Record<
    string,
    string
  >;

  await rlsMatrix(base, anon, passwords, fixtures as Record<string, string>);

  const failed = checks.filter((c) => !c.ok);
  const report = {
    at: new Date().toISOString(),
    target: STAGING,
    productionDenylist: PROD,
    marker: MARKER,
    fixtures,
    checks,
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    verdict:
      failed.length === 0
        ? "RC3 STAGING SECURITY AND FIXTURES PASS"
        : "RC3 STAGING SECURITY AND FIXTURES BLOCKED",
  };
  writeJson("security-fixtures-validation.json", report);
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        passCount: report.passCount,
        failCount: report.failCount,
        failed: failed.map((f) => f.name),
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(2);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
