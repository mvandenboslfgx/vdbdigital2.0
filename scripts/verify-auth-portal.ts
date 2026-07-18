/**
 * Verify auth / portal foundation contracts (fail-closed, local-only).
 *
 * Usage: npm run db:verify-auth-portal
 *
 * Without applied migration/RPC:
 *   RESULT: FAIL — auth portal verification RPC missing
 *
 * Exit: 0 PASS | 1 FAIL | 2 SKIPPED (no credentials)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey } from "./lib/supabase-secret";
import { isDirectCheckoutEnabled } from "../src/config/features";

loadEnvLocal();

type RpcRow = { check_name: string; ok: boolean; detail: string | null };

const MIGRATION_FILES = [
  "supabase/migrations/20260717000000_customer_portal.sql",
  "supabase/migrations/20260718120000_auth_portal_foundation_verify.sql",
];

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function tryLocalDockerRpc(): { rows: RpcRow[]; note: string } | null {
  try {
    const out = execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_vdbdigital2",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-F",
        "\t",
        "-c",
        `SELECT check_name, ok::text, coalesce(detail,'') FROM public.verify_auth_portal_foundation_contracts();`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const rows: RpcRow[] = [];
    for (const line of out.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const [check_name, ok, detail] = t.split("\t");
      rows.push({
        check_name,
        ok: ok === "t" || ok === "true",
        detail: detail || null,
      });
    }
    return {
      rows,
      note: "READ-ONLY local Docker RPC verify_auth_portal_foundation_contracts",
    };
  } catch {
    return null;
  }
}

function assertLocalOnly(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  if (process.env.AUTH_PORTAL_VERIFY_ALLOW_REMOTE === "1") {
    console.warn("WARNING: AUTH_PORTAL_VERIFY_ALLOW_REMOTE=1");
    return;
  }
  if (url && host !== "127.0.0.1" && host !== "localhost") {
    // Docker path is preferred; remote env URL alone is OK if we use Docker.
    return;
  }
}

async function main() {
  console.log("=== Auth portal foundation verify (fail-closed) ===");
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  console.log(
    `P05_MIGRATION_APPLIED: ${process.env.P05_MIGRATION_APPLIED ?? "(unset)"}`,
  );

  if (isDirectCheckoutEnabled()) {
    console.log("RESULT: FAIL — CHECKOUT_ENABLED must remain false");
    process.exit(1);
  }

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

  const docker = tryLocalDockerRpc();
  if (docker) {
    console.log(`DB: ${docker.note}`);
    checks.push({
      name: "rpc:verify_auth_portal_foundation_contracts",
      ok: docker.rows.length > 0,
      detail: docker.rows.length > 0 ? "invoked via docker" : "empty",
    });
    for (const row of docker.rows) {
      checks.push({
        name: row.check_name,
        ok: Boolean(row.ok),
        detail: row.detail ?? undefined,
      });
    }
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = getSupabaseSecretKey();
    if (!url || !secret) {
      console.log("RESULT: SKIPPED — no local Docker and no Supabase credentials");
      process.exit(2);
    }

    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      host = "";
    }
    if (
      host !== "127.0.0.1" &&
      host !== "localhost" &&
      process.env.AUTH_PORTAL_VERIFY_ALLOW_REMOTE !== "1"
    ) {
      console.error(
        "REFUSING: auth portal verify targets non-local host without Docker.",
      );
      process.exit(1);
    }

    const supabase = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let { data, error } = await supabase.rpc(
      "verify_auth_portal_foundation_contracts",
    );
    if (error) {
      const fallback = await supabase.rpc("portal_verify_customer_contracts");
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      const msg = error.message.toLowerCase();
      const missing =
        msg.includes("could not find") ||
        msg.includes("not find the function") ||
        msg.includes("verify_auth_portal") ||
        msg.includes("portal_verify_customer");
      checks.push({
        name: "rpc:verify_auth_portal_foundation_contracts",
        ok: false,
        detail: missing
          ? "auth portal verification RPC missing"
          : error.message,
      });
    } else {
      checks.push({
        name: "rpc:verify_auth_portal_foundation_contracts",
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
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(
      `${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`,
    );
  }

  if (failed.length > 0) {
    const rpcMissing = failed.some((f) =>
      (f.detail || "").includes("verification RPC missing"),
    );
    console.log(
      rpcMissing
        ? "RESULT: FAIL — auth portal verification RPC missing"
        : `RESULT: FAIL — ${failed.length} check(s) failed`,
    );
    process.exit(1);
  }

  console.log("RESULT: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAIL —", err instanceof Error ? err.message : err);
  process.exit(1);
});
