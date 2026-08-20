/**
 * Local-only catalog SSOT SQL assertions.
 * Refuses staging/production URLs. Requires a running local Supabase stack.
 *
 *   npm run db:test-catalog-ssot-local
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadEnvLocal } from "./lib/env-loader";

loadEnvLocal();

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const sqlPath = resolve("tests/sql/catalog_ssot_v1_local.sql");

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

const host = hostOf(url);
if (!host || !LOCAL_HOSTS.has(host)) {
  console.error("BLOCKED: db:test-catalog-ssot-local runs only against local Supabase");
  console.error(`host=${host ?? "MISSING"}`);
  process.exit(2);
}

if (!existsSync(sqlPath)) {
  console.error("FAIL: tests/sql/catalog_ssot_v1_local.sql ontbreekt");
  process.exit(1);
}

const result = spawnSync("npx", ["supabase", "db", "query", "-f", sqlPath], {
  encoding: "utf8",
  shell: true,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/docker|daemon|npipe|connection refused/i.test(combined)) {
    console.error("BLOCKED: lokale Docker/Supabase is niet beschikbaar");
    process.exit(2);
  }
  process.exit(result.status ?? 1);
}

if (/FAIL /m.test(result.stdout ?? "")) {
  console.error("FAIL: catalog SSOT local assertions");
  process.exit(1);
}

console.log("PASS catalog SSOT local SQL runner");
