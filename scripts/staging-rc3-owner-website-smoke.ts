/**
 * Owner website staging smoke: auth + portal/admin route HTML checks against local Next
 * pointed at staging. Never prints secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  STAGING,
  PROD,
  EVIDENCE,
  writeJson,
  ensureDir,
} from "./staging-rc3-apply-lib.js";

const PORT = 3103;
const BASE = `http://127.0.0.1:${PORT}`;
const ENV_FILE = path.join(EVIDENCE, ".vault", "owner-staging.env.local");
const PASSWORDS =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json";
const FIXTURES = path.join(EVIDENCE, "fixtures-ids.json");

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

function assertStaging(url: string) {
  if (!url.includes(STAGING)) throw new Error("not_staging");
  if (url.includes(PROD)) throw new Error("production_denylist");
}

async function waitReady(timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/inloggen`);
      if (r.status > 0 && r.status !== 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("next_not_ready");
}

async function signIn(env: Record<string, string>, email: string, password: string) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anon =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assertStaging(url);
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!res.ok || !body.access_token) throw new Error(`auth_fail_${email}_${res.status}`);
  return body as { access_token: string; refresh_token: string };
}

async function rest(
  env: Record<string, string>,
  access: string,
  table: string,
  query: string,
) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anon =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${url}/rest/v1/${table}${query}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${access}`,
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

async function fetchPage(pathname: string, cookie?: string) {
  const res = await fetch(`${BASE}${pathname}`, {
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : {},
  });
  const text = await res.text();
  const loc = res.headers.get("location") || "";
  return { status: res.status, text, location: loc };
}

function hasErrorBanner(html: string) {
  return /configuratiefout|configuration error|Missing.*SUPABASE|Invalid.*API key|nhsrdnjfsxfikfbdmdfj/i.test(
    html,
  );
}

async function main() {
  ensureDir(EVIDENCE);
  const env = loadEnv(ENV_FILE);
  assertStaging(env.NEXT_PUBLIC_SUPABASE_URL);
  rec("env_staging_url", true, { ref: STAGING });
  rec("env_checkout_disabled", env.CHECKOUT_ENABLED === "false", {
    value: env.CHECKOUT_ENABLED,
  });
  rec(
    "env_contract_rc3",
    env.BACKEND_CONTRACT_VERSION === "vdb-backend-contract@0.2.0-rc.3" &&
      env.VDB_SCHEMA_VERSION ===
        "2026.07.25.messaging-support-appointments-rc3",
    {
      contract: env.BACKEND_CONTRACT_VERSION,
      schema: env.VDB_SCHEMA_VERSION,
    },
  );
  rec("env_no_production_url", !env.NEXT_PUBLIC_SUPABASE_URL.includes(PROD));

  const passwords = JSON.parse(fs.readFileSync(PASSWORDS, "utf8")) as Record<
    string,
    string
  >;
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as Record<
    string,
    string
  >;

  // Start Next with staging env
  const childEnv = { ...process.env, ...env, PORT: String(PORT) };
  // Strip secrets from being logged; spawn only
  const child = spawn(
    "npx",
    ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: true,
    },
  );
  let bootLog = "";
  child.stdout?.on("data", (d) => {
    bootLog += d.toString();
  });
  child.stderr?.on("data", (d) => {
    bootLog += d.toString();
  });

  try {
    await waitReady();
    rec("next_dev_ready", true, { port: PORT });

    const login = await fetchPage("/inloggen");
    rec(
      "login_page_loads",
      login.status === 200 && !hasErrorBanner(login.text),
      { status: login.status, hasProdLeak: /nhsrdnjfsxfikfbdmdfj/.test(login.text) },
    );
    rec("login_no_production_ref", !/nhsrdnjfsxfikfbdmdfj/.test(login.text + login.location));

    const adminLogin = await fetchPage("/admin/login");
    rec(
      "admin_login_page_loads",
      (adminLogin.status === 200 || adminLogin.status === 307 || adminLogin.status === 302) &&
        !hasErrorBanner(adminLogin.text),
      { status: adminLogin.status },
    );

    // Authenticated data smoke (website depends on same staging surfaces)
    const custA = await signIn(
      env,
      "staging+cust_a@example.test",
      passwords["staging+cust_a@example.test"],
    );
    rec("website_cust_a_login", !!custA.access_token);

    const surfaces = [
      ["projects", `portal_projects?id=eq.${fixtures.projectId}&select=id`],
      ["quotes", `portal_quotes?id=eq.${fixtures.quoteId}&select=id`],
      ["invoices", `portal_invoices?id=eq.${fixtures.invoiceId}&select=id`],
      ["documents", `portal_files?select=id&limit=3`],
      [
        "conversation",
        `portal_conversations?id=eq.${fixtures.conversation_id}&select=id,subject`,
      ],
      [
        "messages",
        `portal_messages?conversation_id=eq.${fixtures.conversation_id}&select=id,body,is_internal`,
      ],
      [
        "ticket",
        `portal_support_tickets?id=eq.${fixtures.ticket_id}&select=id,subject`,
      ],
      [
        "replies",
        `portal_support_replies?ticket_id=eq.${fixtures.ticket_id}&select=id,is_internal`,
      ],
      [
        "appointment",
        `portal_appointments?id=eq.${fixtures.appointment_id}&select=id,title`,
      ],
    ] as const;

    for (const [name, q] of surfaces) {
      const [table, query] = q.split("?");
      const r = await rest(env, custA.access_token, table, `?${query}`);
      const arr = Array.isArray(r.data) ? r.data : [];
      if (name === "replies") {
        const hasInternal = arr.some(
          (x: { id?: string }) => x.id === fixtures.internal_reply_id,
        );
        const hasPublic = arr.some(
          (x: { id?: string }) => x.id === fixtures.public_reply_id,
        );
        rec(`website_cust_a_${name}`, hasPublic && !hasInternal, {
          status: r.status,
          count: arr.length,
        });
      } else if (name === "documents") {
        rec(`website_cust_a_${name}`, r.ok, { status: r.status, count: arr.length });
      } else {
        rec(`website_cust_a_${name}`, arr.length >= 1, {
          status: r.status,
          count: arr.length,
        });
      }
    }

    // Protected portal routes should redirect unauthenticated to login
    for (const p of [
      "/portal",
      "/portal/projecten",
      "/portal/offertes",
      "/portal/facturen",
      "/portal/documenten",
      "/portal/berichten",
      "/portal/support",
    ]) {
      const r = await fetchPage(p);
      const redirected =
        r.status === 307 ||
        r.status === 302 ||
        r.status === 303 ||
        /login/i.test(r.location);
      rec(`unauth_redirect_${p}`, redirected, {
        status: r.status,
        location: r.location.slice(0, 120),
      });
    }

    const custB = await signIn(
      env,
      "staging+cust_b@example.test",
      passwords["staging+cust_b@example.test"],
    );
    rec("website_cust_b_login", !!custB.access_token);
    {
      const r = await rest(
        env,
        custB.access_token,
        "portal_projects",
        `?id=eq.${fixtures.projectId}&select=id`,
      );
      rec(
        "website_cust_b_isolated_project",
        Array.isArray(r.data) && r.data.length === 0,
      );
      const conv = await rest(
        env,
        custB.access_token,
        "portal_conversations",
        `?id=eq.${fixtures.conversation_id}&select=id`,
      );
      rec(
        "website_cust_b_isolated_conversation",
        Array.isArray(conv.data) && conv.data.length === 0,
      );
      const empty = await rest(
        env,
        custB.access_token,
        "portal_conversations",
        "?select=id&limit=20",
      );
      rec(
        "website_cust_b_empty_conversations",
        Array.isArray(empty.data) && empty.data.length === 0,
      );
    }

    for (const email of [
      "staging+staff_s@example.test",
      "staging+admin_a@example.test",
      "staging+owner_o@example.test",
    ]) {
      const s = await signIn(env, email, passwords[email]);
      const role = email.split("+")[1].split("@")[0];
      rec(`website_${role}_login`, !!s.access_token);
      const internal = await rest(
        env,
        s.access_token,
        "portal_support_replies",
        `?id=eq.${fixtures.internal_reply_id}&select=id,is_internal`,
      );
      rec(
        `website_${role}_internal_reply`,
        Array.isArray(internal.data) && internal.data.length === 1,
      );
      const msgs = await rest(
        env,
        s.access_token,
        "portal_conversations",
        `?id=eq.${fixtures.conversation_id}&select=id`,
      );
      rec(
        `website_${role}_conversation_manage`,
        Array.isArray(msgs.data) && msgs.data.length === 1,
      );
      const appt = await rest(
        env,
        s.access_token,
        "portal_appointments",
        `?id=eq.${fixtures.appointment_id}&select=id`,
      );
      rec(
        `website_${role}_appointments`,
        Array.isArray(appt.data) && appt.data.length === 1,
      );
    }

    // Negative: partner cross deny already covered; checkout flags via page content
    const home = await fetchPage("/");
    rec(
      "home_no_production_endpoints",
      !/nhsrdnjfsxfikfbdmdfj|api\.mollie\.com\/v2/i.test(home.text),
      { status: home.status },
    );

    // Boot log must not mention production ref
    rec(
      "runtime_logs_no_production_ref",
      !bootLog.includes(PROD),
      { bootLogLen: bootLog.length },
    );
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    // Windows: ensure kill tree
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      /* ignore */
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    at: new Date().toISOString(),
    port: PORT,
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
    checks,
    verdict:
      failed.length === 0
        ? "OWNER WEBSITE STAGING SMOKE PASS"
        : "OWNER WEBSITE STAGING SMOKE BLOCKED",
  };
  writeJson("owner-website-smoke.json", report);
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
