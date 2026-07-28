/**
 * Apply only 20260728090000 to staging + auth/financial/RC3 regression matrix.
 * Never prints secrets. Production denylisted.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  STAGING,
  PROD,
  EVIDENCE,
  ROOT,
  getCliToken,
  assertStagingIdentity,
  sql,
  api,
  writeJson,
  ensureDir,
} from "./staging-rc3-apply-lib.js";

const VERSION = "20260728090000";
const FILENAME =
  "20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql";
const NAME = "fix_partner_financial_summary_partner_id_ambiguity";
const EXPECTED_PRE = { count: 46, tip: "20260725120300" };
const EXPECTED_POST = { count: 47, tip: VERSION };
const OUT = path.join(EVIDENCE, "partner-financial-summary-remediation");

const VAULT_CLIENT =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-ui-device/.vault/staging-client.env";
const VAULT_PASSWORDS =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json";
const FIXTURES = path.join(EVIDENCE, "fixtures-ids.json");

const ACCOUNTS = {
  part_a: "staging+part_a@example.test",
  part_b: "staging+part_b@example.test",
  part_pending: "staging+part_pending@example.test",
  cust_a: "staging+cust_a@example.test",
  staff: "staging+staff_s@example.test",
  admin: "staging+admin_a@example.test",
  owner: "staging+owner_o@example.test",
} as const;

type Check = { name: string; ok: boolean; detail?: unknown };
const checks: Check[] = [];
function rec(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

function loadEnv(p: string) {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).replace(/^\uFEFF/, "")] = line.slice(i + 1);
  }
  return out;
}

async function signIn(base: string, anon: string, email: string, password: string) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!res.ok || !body.access_token) throw new Error(`auth_${email}_${res.status}`);
  return body.access_token;
}

async function rpc(
  base: string,
  anon: string,
  token: string,
  fn: string,
  args: Record<string, unknown> = {},
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
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, text: text.slice(0, 500) };
}

async function rest(
  base: string,
  anon: string,
  token: string,
  table: string,
  query: string,
) {
  const res = await fetch(`${base}/rest/v1/${table}${query}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function migrationState(token: string) {
  const rows = (await sql(
    token,
    `SELECT version::text AS version, name::text AS name
     FROM supabase_migrations.schema_migrations ORDER BY version`,
  )) as Array<{ version: string; name: string }>;
  return {
    count: rows.length,
    tip: rows[rows.length - 1]?.version,
    hasFix: rows.some((r) => r.version === VERSION),
    last5: rows.slice(-5),
  };
}

async function financialIntegrity(token: string) {
  return (await sql(
    token,
    `SELECT
       (SELECT count(*)::int FROM (
          SELECT partner_sale_id FROM public.partner_commissions
          GROUP BY partner_sale_id HAVING count(*)>1) d) AS duplicate_commissions,
       (SELECT count(*)::int FROM (
          SELECT idempotency_key FROM public.partner_ledger_transactions
          GROUP BY idempotency_key HAVING count(*)>1) d) AS duplicate_ledger_events,
       (SELECT count(*)::int FROM public.partner_profiles p
        WHERE public.partner_available_liability_cents(p.id) < 0) AS negative_liability,
       (SELECT count(*)::int FROM (
          SELECT t.id FROM public.partner_ledger_transactions t
          JOIN public.partner_ledger_entries e ON e.transaction_id=t.id
          GROUP BY t.id HAVING sum(e.debit_cents)<>sum(e.credit_cents)
       ) x) AS unbalanced_ledger,
       (WITH gross AS (
          SELECT p.id AS partner_id,
            GREATEST(0,
              COALESCE((SELECT SUM(amount_cents) FROM public.partner_commissions WHERE partner_id=p.id AND status IN ('APPROVED','PAID')),0)
              - COALESCE((SELECT SUM(amount_cents) FROM public.partner_payouts WHERE partner_id=p.id AND status IN ('PENDING','PAID')),0)
              + COALESCE((SELECT SUM(amount_cents) FROM public.partner_adjustments WHERE partner_id=p.id),0)
            )::bigint AS gross_available
          FROM public.partner_profiles p
        ),
        res AS (
          SELECT partner_id, coalesce(sum(requested_amount_cents),0)::bigint AS reserved
          FROM public.partner_payout_requests WHERE status='REQUESTED' GROUP BY partner_id
        )
        SELECT count(*)::int FROM gross g LEFT JOIN res r ON r.partner_id=g.partner_id
        WHERE coalesce(r.reserved,0) > g.gross_available
       ) AS payout_overreservation`,
  )) as Array<Record<string, number>>;
}

async function applyFix(token: string) {
  const before = await migrationState(token);
  if (before.count !== EXPECTED_PRE.count || before.tip !== EXPECTED_PRE.tip) {
    throw new Error(`precondition:${before.count}/${before.tip}`);
  }
  if (before.hasFix) throw new Error("already_applied");

  const fp = path.join(ROOT, "supabase/migrations", FILENAME);
  const content = fs.readFileSync(fp, "utf8").replace(/^\uFEFF/, "");
  const sha = createHash("sha256").update(fs.readFileSync(fp)).digest("hex");

  await sql(token, content);

  const tag = `mig${VERSION}`;
  await sql(
    token,
    `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
     VALUES ('${VERSION}', '${NAME}', ARRAY[$${tag}$${content}$${tag}$]::text[]);`,
  );

  const after = await migrationState(token);
  if (after.count !== EXPECTED_POST.count || after.tip !== EXPECTED_POST.tip) {
    throw new Error(`postcondition:${after.count}/${after.tip}`);
  }

  const def = (await sql(
    token,
    `SELECT pg_get_functiondef('public.partner_financial_summary(uuid)'::regprocedure) AS def`,
  )) as Array<{ def: string }>;
  if (/WHERE partner_id = v_pid/.test(def[0].def)) {
    throw new Error("unqualified_still_present");
  }

  return { before, after, sha, def: def[0].def };
}

async function main() {
  ensureDir(OUT);
  const token = getCliToken();
  await assertStagingIdentity(token);

  // Production denylist proof (identity GET only)
  const prodGet = await api(token, "GET", `/v1/projects/${PROD}`);
  writeJson(
    path.relative(EVIDENCE, path.join(OUT, "production-denylist-proof.json")).replace(/\\/g, "/"),
    {
      ref: PROD,
      getStatus: prodGet.status,
      note: "identity only; no SQL",
      stagingTarget: STAGING,
    },
  );
  // writeJson expects relative to EVIDENCE - fix by writing directly
  fs.writeFileSync(
    path.join(OUT, "production-denylist-proof.json"),
    JSON.stringify(
      {
        ref: PROD,
        getStatus: prodGet.status,
        note: "identity only; no SQL",
        stagingTarget: STAGING,
      },
      null,
      2,
    ) + "\n",
  );

  const finBefore = await financialIntegrity(token);
  const apply = await applyFix(token);
  fs.writeFileSync(
    path.join(OUT, "staging-apply.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        migration: { version: VERSION, filename: FILENAME, name: NAME, sha256: apply.sha },
        before: apply.before,
        after: apply.after,
        newDefinitionExcerpt: apply.def.slice(0, 1200),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ applied: true, before: apply.before, after: apply.after }, null, 2),
  );

  const env = loadEnv(VAULT_CLIENT);
  if (!env.STAGING_SUPABASE_URL.includes(STAGING)) throw new Error("not_staging");
  const base = env.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = env.STAGING_SUPABASE_ANON_KEY;
  const passwords = JSON.parse(fs.readFileSync(VAULT_PASSWORDS, "utf8")) as Record<
    string,
    string
  >;

  // Partner profile IDs
  const profiles = (await sql(
    token,
    `SELECT pp.id::text AS id, u.email::text AS email
     FROM public.partner_profiles pp
     JOIN auth.users u ON u.id = pp.user_id
     WHERE u.email IN ('${ACCOUNTS.part_a}','${ACCOUNTS.part_b}')`,
  )) as Array<{ id: string; email: string }>;
  const partAId = profiles.find((p) => p.email === ACCOUNTS.part_a)?.id;
  const partBId = profiles.find((p) => p.email === ACCOUNTS.part_b)?.id;
  if (!partAId || !partBId) throw new Error("missing_partner_profiles");

  // Positive A/B
  const tokA = await signIn(base, anon, ACCOUNTS.part_a, passwords[ACCOUNTS.part_a]);
  const tokB = await signIn(base, anon, ACCOUNTS.part_b, passwords[ACCOUNTS.part_b]);
  const sumA = await rpc(base, anon, tokA, "partner_financial_summary", {
    p_partner_id: null,
  });
  const sumB = await rpc(base, anon, tokB, "partner_financial_summary", {
    p_partner_id: null,
  });
  const rowA = Array.isArray(sumA.data) ? sumA.data[0] : sumA.data;
  const rowB = Array.isArray(sumB.data) ? sumB.data[0] : sumB.data;
  rec(
    "part_a_positive",
    sumA.ok &&
      rowA &&
      (rowA as { partner_id?: string }).partner_id === partAId &&
      typeof (rowA as { available_cents?: number }).available_cents === "number",
    { status: sumA.status, partner_id: (rowA as { partner_id?: string })?.partner_id },
  );
  rec(
    "part_b_positive",
    sumB.ok &&
      rowB &&
      (rowB as { partner_id?: string }).partner_id === partBId,
    { status: sumB.status, partner_id: (rowB as { partner_id?: string })?.partner_id },
  );
  rec(
    "part_a_b_isolation",
    (rowA as { partner_id?: string })?.partner_id !==
      (rowB as { partner_id?: string })?.partner_id &&
      (rowA as { partner_id?: string })?.partner_id === partAId &&
      (rowB as { partner_id?: string })?.partner_id === partBId,
  );

  // Cross: partner A requesting partner B id (non-staff) must still resolve to own
  const cross = await rpc(base, anon, tokA, "partner_financial_summary", {
    p_partner_id: partBId,
  });
  const crossRow = Array.isArray(cross.data) ? cross.data[0] : cross.data;
  rec(
    "part_a_cannot_read_part_b_summary",
    cross.ok && (crossRow as { partner_id?: string })?.partner_id === partAId,
    { status: cross.status, partner_id: (crossRow as { partner_id?: string })?.partner_id },
  );

  // Denies
  const pending = await signIn(
    base,
    anon,
    ACCOUNTS.part_pending,
    passwords[ACCOUNTS.part_pending],
  );
  const pendingR = await rpc(base, anon, pending, "partner_financial_summary", {
    p_partner_id: null,
  });
  rec(
    "pending_partner_deny",
    !pendingR.ok || /FORBIDDEN|P0001/i.test(pendingR.text),
    { status: pendingR.status, text: pendingR.text },
  );

  const cust = await signIn(base, anon, ACCOUNTS.cust_a, passwords[ACCOUNTS.cust_a]);
  const custR = await rpc(base, anon, cust, "partner_financial_summary", {
    p_partner_id: null,
  });
  rec(
    "customer_deny",
    !custR.ok || /FORBIDDEN|P0001/i.test(custR.text),
    { status: custR.status },
  );

  const anonR = await rpc(base, anon, anon, "partner_financial_summary", {
    p_partner_id: null,
  });
  rec(
    "anon_deny",
    !anonR.ok || /FORBIDDEN|P0001|JWT|401|403/i.test(anonR.text + String(anonR.status)),
    { status: anonR.status },
  );

  // Staff/admin/owner: with p_partner_id may read; without → FORBIDDEN if no partner profile
  for (const [role, email] of [
    ["staff", ACCOUNTS.staff],
    ["admin", ACCOUNTS.admin],
    ["owner", ACCOUNTS.owner],
  ] as const) {
    const t = await signIn(base, anon, email, passwords[email]);
    const without = await rpc(base, anon, t, "partner_financial_summary", {
      p_partner_id: null,
    });
    rec(
      `${role}_without_pid_forbidden`,
      !without.ok && /FORBIDDEN|P0001/i.test(without.text),
      { status: without.status, text: without.text },
    );
    const withPid = await rpc(base, anon, t, "partner_financial_summary", {
      p_partner_id: partAId,
    });
    const wr = Array.isArray(withPid.data) ? withPid.data[0] : withPid.data;
    rec(
      `${role}_with_partner_a_pid_allowed`,
      withPid.ok && (wr as { partner_id?: string })?.partner_id === partAId,
      { status: withPid.status, partner_id: (wr as { partner_id?: string })?.partner_id },
    );
  }

  // Financial integrity
  const fin = (await financialIntegrity(token))[0];
  for (const k of [
    "duplicate_commissions",
    "duplicate_ledger_events",
    "negative_liability",
    "unbalanced_ledger",
    "payout_overreservation",
  ]) {
    rec(`financial_${k}_zero`, fin[k] === 0, { value: fin[k], before: finBefore[0]?.[k] });
  }

  // RC3 regression smoke
  const fixtures = fs.existsSync(FIXTURES)
    ? (JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as Record<string, string>)
    : null;
  if (fixtures?.conversation_id) {
    const conv = await rest(
      base,
      anon,
      tokA,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id`,
    );
    // partner A should NOT see customer conversation
    rec(
      "rc3_part_a_no_customer_conversation",
      Array.isArray(conv.data) && conv.data.length === 0,
      { status: conv.status },
    );
    const custConv = await rest(
      base,
      anon,
      cust,
      "portal_conversations",
      `?id=eq.${fixtures.conversation_id}&select=id`,
    );
    rec(
      "rc3_cust_a_still_sees_conversation",
      Array.isArray(custConv.data) && custConv.data.length === 1,
    );
    const verify = (await sql(
      token,
      `SELECT count(*)::int AS n FROM public.verify_messaging_support_appointments_contracts() WHERE ok IS NOT TRUE`,
    )) as Array<{ n: number }>;
    rec("rc3_contract_verify_clean", verify[0]?.n === 0, verify[0]);
  } else {
    rec("rc3_fixtures_present", false, { note: "fixtures-ids.json missing" });
  }

  // Flags
  const flags = (await sql(
    token,
    `SELECT key::text AS key, enabled FROM public.feature_flags
     WHERE key IN ('digital_product_checkout','mollie_checkout','payments.mollie_checkout',
                   'payments.digital_goods_checkout','messaging_realtime','appointments_booking',
                   'support_internal_notes_rpc') ORDER BY key`,
  )) as Array<{ key: string; enabled: boolean }>;
  rec("checkout_mollie_rc3_flags_disabled", flags.every((f) => f.enabled === false), flags);

  // No ambiguity residual
  rec("no_ambiguity_code_42702", !/42702|ambiguous/i.test(JSON.stringify(sumA) + JSON.stringify(sumB)));

  const failed = checks.filter((c) => !c.ok);
  const report = {
    at: new Date().toISOString(),
    contractBumpDecision: {
      bump: false,
      reason:
        "Signature, returns, grants, and authorization semantics unchanged; implementation-only disambiguation of OUT vs column partner_id. Keep vdb-backend-contract@0.2.0-rc.3 / schemaVersion 2026.07.25.messaging-support-appointments-rc3.",
    },
    rootCause:
      "RETURNS TABLE(... partner_id uuid ...) introduces PL/pgSQL OUT variable partner_id; unqualified WHERE partner_id = v_pid in partner_commissions/partner_payouts subqueries raised SQLSTATE 42702.",
    oldSignature: "partner_financial_summary(p_partner_id uuid DEFAULT NULL) RETURNS TABLE(partner_id uuid, available_cents bigint, approved_commission_cents bigint, paid_payout_cents bigint)",
    newSignature: "unchanged — same identity arguments and RETURNS TABLE columns; body uses c.partner_id / pay.partner_id / pp.user_id",
    migration: { version: VERSION, filename: FILENAME, sha256: apply.sha },
    before: apply.before,
    after: apply.after,
    financialBefore: finBefore[0],
    financialAfter: fin,
    checks,
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    verdict:
      failed.length === 0
        ? "OWNER RC3 PARTNER FINANCIAL SUMMARY RPC REMEDIATION PASS"
        : "OWNER RC3 PARTNER FINANCIAL SUMMARY RPC REMEDIATION BLOCKED",
  };
  fs.writeFileSync(path.join(OUT, "validation-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        passCount: report.passCount,
        failCount: report.failCount,
        failed: failed.map((f) => f.name),
        migrations: `${apply.after.count}/${apply.after.tip}`,
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
