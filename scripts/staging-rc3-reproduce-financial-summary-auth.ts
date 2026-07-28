/**
 * Reproduce ambiguity as authenticated partner via PostgREST.
 */
import fs from "node:fs";
import path from "node:path";
import { EVIDENCE, STAGING, PROD, ensureDir } from "./staging-rc3-apply-lib.js";

const VAULT_CLIENT =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-ui-device/.vault/staging-client.env";
const VAULT_PASSWORDS =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json";
const OUT = path.join(EVIDENCE, "partner-financial-summary-remediation");

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

async function rpc(base: string, anon: string, token: string, args: Record<string, unknown>) {
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
  return { status: res.status, ok: res.ok, data, text: text.slice(0, 800) };
}

async function main() {
  ensureDir(OUT);
  const env = loadEnv(VAULT_CLIENT);
  if (!env.STAGING_SUPABASE_URL.includes(STAGING)) throw new Error("not_staging");
  if (env.STAGING_SUPABASE_URL.includes(PROD)) throw new Error("prod");
  const base = env.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = env.STAGING_SUPABASE_ANON_KEY;
  const passwords = JSON.parse(fs.readFileSync(VAULT_PASSWORDS, "utf8")) as Record<
    string,
    string
  >;

  const results: Record<string, unknown> = {};
  for (const email of [
    "staging+part_a@example.test",
    "staging+part_b@example.test",
    "staging+staff_s@example.test",
  ]) {
    const token = await signIn(base, anon, email, passwords[email]);
    const r = await rpc(base, anon, token, { p_partner_id: null });
    results[email] = {
      status: r.status,
      ok: r.ok,
      text: r.text,
      ambiguous: /ambiguous|42702/i.test(r.text),
    };
  }

  // anon
  const anonR = await rpc(base, anon, anon, { p_partner_id: null });
  results.anon = {
    status: anonR.status,
    ok: anonR.ok,
    text: anonR.text,
    ambiguous: /ambiguous|42702/i.test(anonR.text),
  };

  fs.writeFileSync(
    path.join(OUT, "reproduce-authenticated.json"),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
