/**
 * Verify customer portal database contracts (fail-closed).
 *
 * Usage:
 *   npm run db:verify-customer-portal
 *
 * Without applied migration:
 *   RESULT: FAIL — customer portal verification RPC missing
 *
 * Exit: 0 PASS | 1 FAIL | 2 SKIPPED (no credentials)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();

type RpcRow = { check_name: string; ok: boolean; detail: string | null };

const MIGRATION_FILES = [
  "supabase/migrations/20260717000000_customer_portal.sql",
];

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertLocalOnly(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";
  const local =
    host === "127.0.0.1" ||
    host === "localhost" ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("localhost");

  if (process.env.PORTAL_VERIFY_ALLOW_REMOTE === "1") {
    console.warn("WARNING: PORTAL_VERIFY_ALLOW_REMOTE=1 — remote verify allowed by operator");
    return;
  }

  if (!local && (url || dbUrl)) {
    console.error(
      "REFUSING: customer portal verify targets non-local host. Use localhost/127.0.0.1 only.",
    );
    process.exit(1);
  }
}

async function main() {
  assertLocalOnly();

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  for (const file of MIGRATION_FILES) {
    const full = resolve(process.cwd(), file);
    const present = existsSync(full);
    checks.push({
      name: `repo:${file.split("/").pop()}`,
      ok: present,
      detail: present ? `sha256=${sha256File(full).slice(0, 16)}…` : "missing",
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = getSupabaseSecretKey();
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !secret) {
    console.log("RESULT: SKIPPED — no Supabase credentials");
    process.exit(2);
  }

  const supabase = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("portal_verify_customer_contracts");

  if (error) {
    const msg = error.message.toLowerCase();
    const missing =
      msg.includes("could not find") ||
      msg.includes("not find the function") ||
      msg.includes("portal_verify_customer_contracts");
    checks.push({
      name: "rpc:portal_verify_customer_contracts",
      ok: false,
      detail: missing
        ? "customer portal verification RPC missing"
        : error.message,
    });
  } else {
    checks.push({
      name: "rpc:portal_verify_customer_contracts",
      ok: true,
      detail: "invoked",
    });
    for (const row of (data as RpcRow[]) ?? []) {
      checks.push({
        name: row.check_name,
        ok: Boolean(row.ok),
        detail: row.detail ?? undefined,
      });
    }
  }

  if (publicKey) {
    const anon = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonResult = await anon.rpc("portal_verify_customer_contracts");
    checks.push({
      name: "security:anon_cannot_call_verifier",
      ok: Boolean(anonResult.error),
      detail: anonResult.error
        ? "anon denied (expected)"
        : "anon was able to call verifier",
    });
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  if (failed.length > 0) {
    const rpcMissing = failed.some((f) =>
      (f.detail || "").includes("verification RPC missing"),
    );
    console.log(
      rpcMissing
        ? "RESULT: FAIL — customer portal verification RPC missing"
        : `RESULT: FAIL — ${failed.length} check(s) failed`,
    );
    process.exit(1);
  }

  console.log("RESULT: PASS — customer portal contracts verified");
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAIL —", err instanceof Error ? err.message : err);
  process.exit(1);
});
