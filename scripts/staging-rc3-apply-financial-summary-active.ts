/**
 * Apply 20260728090100 (ACTIVE-only) to staging and re-run auth matrix.
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
} from "./staging-rc3-apply-lib.js";

const VERSION = "20260728090100";
const FILENAME = "20260728090100_partner_financial_summary_active_only.sql";
const NAME = "partner_financial_summary_active_only";
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
  args: Record<string, unknown> = {},
) {
  const res = await fetch(`${base}/rest/v1/rpc/partner_financial_summary`, {
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

async function main() {
  const token = getCliToken();
  await assertStagingIdentity(token);

  const beforeRows = (await sql(
    token,
    `SELECT version::text AS version FROM supabase_migrations.schema_migrations ORDER BY version`,
  )) as Array<{ version: string }>;
  const before = {
    count: beforeRows.length,
    tip: beforeRows[beforeRows.length - 1]?.version,
  };
  if (before.tip !== "20260728090000" || before.count !== 47) {
    throw new Error(`unexpected_before:${before.count}/${before.tip}`);
  }

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

  const afterRows = (await sql(
    token,
    `SELECT version::text AS version FROM supabase_migrations.schema_migrations ORDER BY version`,
  )) as Array<{ version: string }>;
  const after = {
    count: afterRows.length,
    tip: afterRows[afterRows.length - 1]?.version,
  };
  if (after.count !== 48 || after.tip !== VERSION) {
    throw new Error(`unexpected_after:${after.count}/${after.tip}`);
  }

  const profiles = (await sql(
    token,
    `SELECT u.email::text AS email, pp.id::text AS id, pp.status::text AS status
     FROM public.partner_profiles pp
     JOIN auth.users u ON u.id = pp.user_id
     WHERE u.email IN ('${ACCOUNTS.part_a}','${ACCOUNTS.part_b}','${ACCOUNTS.part_pending}')`,
  )) as Array<{ email: string; id: string; status: string }>;
  const partAId = profiles.find((p) => p.email === ACCOUNTS.part_a)?.id;
  const partBId = profiles.find((p) => p.email === ACCOUNTS.part_b)?.id;
  const pendingStatus = profiles.find((p) => p.email === ACCOUNTS.part_pending)?.status;
  if (!partAId || !partBId) throw new Error("missing_partner_profile_ids");

  const env = loadEnv(VAULT_CLIENT);
  const base = env.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = env.STAGING_SUPABASE_ANON_KEY;
  const passwords = JSON.parse(fs.readFileSync(VAULT_PASSWORDS, "utf8")) as Record<
    string,
    string
  >;

  const tokA = await signIn(base, anon, ACCOUNTS.part_a, passwords[ACCOUNTS.part_a]);
  const tokB = await signIn(base, anon, ACCOUNTS.part_b, passwords[ACCOUNTS.part_b]);
  const sumA = await rpc(base, anon, tokA, { p_partner_id: null });
  const sumB = await rpc(base, anon, tokB, { p_partner_id: null });
  const rowA = (Array.isArray(sumA.data) ? sumA.data[0] : sumA.data) as {
    partner_id?: string;
  };
  const rowB = (Array.isArray(sumB.data) ? sumB.data[0] : sumB.data) as {
    partner_id?: string;
  };
  rec("part_a_positive", sumA.ok && rowA?.partner_id === partAId, sumA);
  rec("part_b_positive", sumB.ok && rowB?.partner_id === partBId, sumB);
  rec("part_a_b_isolation", rowA?.partner_id === partAId && rowB?.partner_id === partBId);

  const cross = await rpc(base, anon, tokA, { p_partner_id: partBId });
  const crossRow = (Array.isArray(cross.data) ? cross.data[0] : cross.data) as {
    partner_id?: string;
  };
  rec("part_a_cannot_read_part_b_summary", cross.ok && crossRow?.partner_id === partAId);

  const pendingTok = await signIn(
    base,
    anon,
    ACCOUNTS.part_pending,
    passwords[ACCOUNTS.part_pending],
  );
  const pendingR = await rpc(base, anon, pendingTok, { p_partner_id: null });
  rec(
    "pending_partner_deny",
    !pendingR.ok && /FORBIDDEN|P0001/i.test(pendingR.text),
    { status: pendingR.status, text: pendingR.text, pendingStatus },
  );

  const cust = await signIn(base, anon, ACCOUNTS.cust_a, passwords[ACCOUNTS.cust_a]);
  const custR = await rpc(base, anon, cust, { p_partner_id: null });
  rec("customer_deny", !custR.ok && /FORBIDDEN|P0001/i.test(custR.text), {
    status: custR.status,
  });

  const anonR = await rpc(base, anon, anon, { p_partner_id: null });
  rec("anon_deny", !anonR.ok, { status: anonR.status, text: anonR.text });

  for (const [role, email] of [
    ["staff", ACCOUNTS.staff],
    ["admin", ACCOUNTS.admin],
    ["owner", ACCOUNTS.owner],
  ] as const) {
    const t = await signIn(base, anon, email, passwords[email]);
    const without = await rpc(base, anon, t, { p_partner_id: null });
    rec(
      `${role}_without_pid_forbidden`,
      !without.ok && /FORBIDDEN|P0001/i.test(without.text),
      { status: without.status },
    );
    const withPid = await rpc(base, anon, t, { p_partner_id: partAId });
    const wr = (Array.isArray(withPid.data) ? withPid.data[0] : withPid.data) as {
      partner_id?: string;
    };
    rec(
      `${role}_with_partner_a_pid_allowed`,
      withPid.ok && wr?.partner_id === partAId,
      { status: withPid.status },
    );
  }

  const fin = (await sql(
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
  for (const [k, v] of Object.entries(fin[0])) {
    rec(`financial_${k}_zero`, v === 0, { value: v });
  }

  const fixtures = JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as Record<string, string>;
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
  rec("rc3_contract_verify_clean", verify[0]?.n === 0);

  const flags = (await sql(
    token,
    `SELECT key::text AS key, enabled FROM public.feature_flags
     WHERE key IN ('digital_product_checkout','mollie_checkout','payments.mollie_checkout',
                   'payments.digital_goods_checkout')`,
  )) as Array<{ key: string; enabled: boolean }>;
  rec("checkout_mollie_disabled", flags.every((f) => !f.enabled), flags);

  const def = (await sql(
    token,
    `SELECT pg_get_functiondef('public.partner_financial_summary(uuid)'::regprocedure) AS def`,
  )) as Array<{ def: string }>;
  rec(
    "def_qualified_and_active",
    /c\.partner_id = v_pid/.test(def[0].def) &&
      /pay\.partner_id = v_pid/.test(def[0].def) &&
      /pp\.status = 'ACTIVE'/.test(def[0].def) &&
      !/WHERE partner_id = v_pid/.test(def[0].def),
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    at: new Date().toISOString(),
    staging: STAGING,
    productionDenylist: PROD,
    migrationsApplied: [
      {
        version: "20260728090000",
        name: "fix_partner_financial_summary_partner_id_ambiguity",
        purpose: "disambiguate OUT partner_id vs table columns",
      },
      {
        version: VERSION,
        filename: FILENAME,
        sha256: sha,
        purpose: "self-access requires partner_profiles.status = ACTIVE",
      },
    ],
    before090100: before,
    after: after,
    pendingProfileStatus: pendingStatus,
    contractBumpDecision: {
      bump: false,
      reason:
        "Same RPC signature and return shape; ambiguity fix + ACTIVE self-access sharpening within existing partner(own)/staff contract. Keep vdb-backend-contract@0.2.0-rc.3 / 2026.07.25.messaging-support-appointments-rc3.",
    },
    checks,
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    financial: fin[0],
    verdict:
      failed.length === 0
        ? "OWNER RC3 PARTNER FINANCIAL SUMMARY RPC REMEDIATION PASS"
        : "OWNER RC3 PARTNER FINANCIAL SUMMARY RPC REMEDIATION BLOCKED",
  };
  fs.writeFileSync(
    path.join(OUT, "validation-report-final.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(OUT, "staging-apply-90100.json"),
    JSON.stringify({ before, after, sha, filename: FILENAME }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        passCount: report.passCount,
        failCount: report.failCount,
        failed: failed.map((f) => f.name),
        migrations: `${after.count}/${after.tip}`,
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
