/**
 * Verify invoices financial contracts (fail-closed, local-only).
 * Usage: npm run db:verify-invoices-financial
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
  "supabase/migrations/20260719160000_invoices_financial_documents.sql",
  "supabase/migrations/20260719170000_invoice_payment_reversal_integrity.sql",
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
        `SELECT check_name, ok::text, coalesce(detail,'') FROM public.verify_invoices_financial_contracts();`,
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
      note: "READ-ONLY local Docker RPC verify_invoices_financial_contracts",
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Invoices financial verify (fail-closed) ===");
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  console.log(
    `P05_MIGRATION_APPLIED: ${process.env.P05_MIGRATION_APPLIED ?? "(unset)"}`,
  );

  if (isDirectCheckoutEnabled()) {
    console.log("RESULT: FAIL — CHECKOUT_ENABLED must remain false");
    process.exit(1);
  }

  for (const rel of MIGRATION_FILES) {
    const abs = resolve(process.cwd(), rel);
    if (!existsSync(abs)) {
      console.log(`RESULT: FAIL — missing migration file ${rel}`);
      process.exit(1);
    }
    console.log(`migration ${rel} sha256=${sha256File(abs).slice(0, 12)}…`);
  }

  let rows: RpcRow[] | null = null;
  let note = "";
  const docker = tryLocalDockerRpc();
  if (docker && docker.rows.length > 0) {
    rows = docker.rows;
    note = docker.note;
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = getSupabaseSecretKey();
    if (!url || !key) {
      console.log("RESULT: FAIL — invoices financial verification RPC missing");
      process.exit(1);
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc(
      "verify_invoices_financial_contracts",
    );
    if (error || !data) {
      console.log("RESULT: FAIL — invoices financial verification RPC missing");
      if (error) console.log(error.message);
      process.exit(1);
    }
    rows = data as RpcRow[];
    note = "READ-ONLY supabase.rpc verify_invoices_financial_contracts";
  }

  if (!rows?.length) {
    console.log("RESULT: FAIL — invoices financial verification RPC missing");
    process.exit(1);
  }

  console.log(note);
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? "OK" : "FAIL";
    if (!row.ok) failed += 1;
    console.log(
      `  [${mark}] ${row.check_name}${row.detail ? ` — ${row.detail}` : ""}`,
    );
  }

  if (failed > 0) {
    console.log(`RESULT: FAIL — ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("RESULT: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  console.log("RESULT: FAIL — unexpected error");
  process.exit(1);
});
