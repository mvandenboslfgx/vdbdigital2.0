/**
 * Secrets-free env presence/shape check for staging readiness.
 * Prints only present/missing/test-shaped/live-shaped/unknown and non-secret hosts.
 */
import { existsSync, readFileSync } from "node:fs";

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const env = { ...parseEnvFile(".env.local"), ...process.env } as Record<
  string,
  string | undefined
>;

function shapeKey(key: string): unknown {
  const v = (env[key] ?? "").trim();
  if (!v) return "missing";
  if (key === "MOLLIE_API_KEY") {
    if (v.startsWith("test_")) return "test-shaped";
    if (v.startsWith("live_")) return "live-shaped";
    return "unknown";
  }
  if (key === "NEXT_PUBLIC_SUPABASE_URL") {
    try {
      const u = new URL(v);
      const m = u.host.match(/^([a-z0-9]+)\.supabase\.co$/i);
      const ref = m?.[1] ?? null;
      return {
        present: true,
        host: u.host,
        local: u.hostname === "127.0.0.1" || u.hostname === "localhost",
        refPrefix: ref ? `${ref.slice(0, 4)}…` : null,
        eqProdCandidate: ref === "nhsrdnjfsxfikfbdmdfj",
      };
    } catch {
      return { present: true, parse: "fail" };
    }
  }
  if (key === "CHECKOUT_ENABLED" || key === "P05_MIGRATION_APPLIED") {
    return v;
  }
  return "present";
}

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "MOLLIE_API_KEY",
  "MOLLIE_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CHECKOUT_ENABLED",
  "P05_MIGRATION_APPLIED",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

for (const k of keys) {
  console.log(`${k}=${JSON.stringify(shapeKey(k))}`);
}
