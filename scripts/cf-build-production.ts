/**
 * Load production NEXT_PUBLIC_* from generated wrangler deploy config, park
 * local .env.local so Next cannot mix staging secrets with production public
 * URL, then run OpenNext build so APP_URL is not inlined as localhost.
 */
import { existsSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const GENERATED = ".wrangler.deploy.generated.json";
const LIVE = path.join("docs", "evidence", ".live-plain-vars.json");
const ENV_LOCAL = ".env.local";
const ENV_LOCAL_PARKED = ".env.local.cfbuild.bak";

function loadVars(): Record<string, string> {
  if (existsSync(GENERATED)) {
    const g = JSON.parse(readFileSync(GENERATED, "utf8")) as {
      vars?: Record<string, string>;
    };
    return g.vars ?? {};
  }
  if (existsSync(LIVE)) {
    return JSON.parse(readFileSync(LIVE, "utf8")) as Record<string, string>;
  }
  console.error("FAIL: run npm run cf:predeploy-check first");
  process.exit(1);
}

const vars = loadVars();
const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_NAME",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];
for (const key of required) {
  if (!vars[key]) {
    console.error(`FAIL: missing ${key} in production plain vars`);
    process.exit(1);
  }
}
if (!/^https:\/\/vdbdigital\.nl\/?$/.test(vars.NEXT_PUBLIC_APP_URL.trim())) {
  console.error(
    `FAIL: NEXT_PUBLIC_APP_URL must be https://vdbdigital.nl, got length=${vars.NEXT_PUBLIC_APP_URL.length}`,
  );
  process.exit(1);
}

const env: NodeJS.ProcessEnv = { ...process.env };
for (const [k, v] of Object.entries(vars)) {
  if (k.startsWith("NEXT_PUBLIC_") || k === "APP_ENV" || k === "CLOUDFLARE_ENV") {
    env[k] = v;
  }
}
env.NEXT_PUBLIC_APP_URL = vars.NEXT_PUBLIC_APP_URL;
env.NEXT_PUBLIC_SITE_NAME = vars.NEXT_PUBLIC_SITE_NAME;
env.NEXT_PUBLIC_SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
env.NODE_ENV = "production";
env.OPENNEXT_CF_BUILD = "1";
// Authorize production Supabase URL during prerender (sitemap etc.) without
// requiring live secrets in the local shell.
env.APP_ENV = "production";
env.CLOUDFLARE_ENV = "production";
env.ALLOW_PRODUCTION_SUPABASE_WRITES = "1";
delete env.REQUIRE_PRODUCTION_ENV;
delete env.SUPABASE_SECRET_KEY;
delete env.SUPABASE_SERVICE_ROLE_KEY;
delete env.MOLLIE_API_KEY;
delete env.RESEND_API_KEY;

console.log(
  "Building OpenNext with production public env:",
  required.map((k) => `${k}=set(${vars[k].length})`).join(", "),
);

let parked = false;
if (existsSync(ENV_LOCAL)) {
  if (existsSync(ENV_LOCAL_PARKED)) {
    console.error(`FAIL: ${ENV_LOCAL_PARKED} already exists — resolve manually`);
    process.exit(1);
  }
  renameSync(ENV_LOCAL, ENV_LOCAL_PARKED);
  parked = true;
  console.log(`Parked ${ENV_LOCAL} → ${ENV_LOCAL_PARKED} for production compile`);
}

const opennextBin = path.join(
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "index.js",
);

let status = 1;
try {
  const r = spawnSync(process.execPath, [opennextBin, "build"], {
    env,
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
  });
  status = r.status ?? 1;
} finally {
  if (parked && existsSync(ENV_LOCAL_PARKED)) {
    renameSync(ENV_LOCAL_PARKED, ENV_LOCAL);
    console.log(`Restored ${ENV_LOCAL}`);
  }
}

process.exit(status);
