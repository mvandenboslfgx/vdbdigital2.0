/**
 * Fail-closed Cloudflare predeploy guard.
 * REQUIRED LIVE BINDINGS − NEW DEPLOYMENT BINDINGS = must be EMPTY.
 * Never prints secret or plaintext values — names/types only.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const WORKER = "vdbdigital-live-new";
const ROLLBACK_VERSION =
  process.env.CF_ROLLBACK_VERSION_ID ||
  "f84ffd2e-b118-402e-9b06-37a9f7fc804f";
const MANIFEST_PATH = path.join(
  "docs",
  "evidence",
  "production-cloudflare-binding-manifest.json",
);
const LIVE_VARS_PATH = path.join("docs", "evidence", ".live-plain-vars.json");
// Must live at repo root so wrangler resolves `.open-next/worker.js` correctly
// (paths in config are relative to the config file directory).
const GENERATED_CONFIG_PATH = ".wrangler.deploy.generated.json";

type Manifest = {
  required_plain_vars: string[];
  required_secrets: string[];
  wrangler_declared_vars: string[];
  dashboard_managed_plain_vars: string[];
  rollback_target: { version_id: string };
};

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function stripJsonc(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function wranglerDeclaredVars(): string[] {
  const raw = readFileSync("wrangler.jsonc", "utf8");
  const cfg = JSON.parse(stripJsonc(raw)) as {
    vars?: Record<string, string>;
    keep_vars?: boolean;
  };
  if (!cfg.keep_vars) {
    console.error("FAIL: wrangler.jsonc must set keep_vars: true");
    process.exit(1);
  }
  return Object.keys(cfg.vars ?? {}).sort();
}

function syncLivePlainVars(): Record<string, string> {
  const view = spawnSync(
    "npx",
    [
      "wrangler",
      "versions",
      "view",
      ROLLBACK_VERSION,
      "--name",
      WORKER,
      "--json",
    ],
    { encoding: "utf8", shell: true },
  );
  if (view.status !== 0) {
    console.error("FAIL: cannot read rollback version bindings");
    console.error(view.stderr || view.stdout);
    process.exit(1);
  }
  const parsed = JSON.parse(view.stdout) as {
    resources?: { bindings?: Array<{ type: string; name: string; text?: string }> };
  };
  const out: Record<string, string> = {};
  for (const b of parsed.resources?.bindings ?? []) {
    if (b.type === "plain_text" && typeof b.text === "string") {
      out[b.name] = b.text;
    }
  }
  mkdirSync(path.dirname(LIVE_VARS_PATH), { recursive: true });
  writeFileSync(LIVE_VARS_PATH, JSON.stringify(out, null, 2));
  return out;
}

function remoteSecretNames(): string[] {
  const r = spawnSync(
    "npx",
    ["wrangler", "secret", "list", "--name", WORKER],
    { encoding: "utf8", shell: true },
  );
  if (r.status !== 0) {
    console.error("FAIL: cannot list remote secrets");
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  try {
    const list = JSON.parse(r.stdout) as Array<{ name: string }>;
    return list.map((s) => s.name).sort();
  } catch {
    // Fallback: parse table-ish output for NAME column
    const names: string[] = [];
    for (const line of (r.stdout || "").split("\n")) {
      const m = line.match(/^\s*([A-Z][A-Z0-9_]+)\s+/);
      if (m && m[1] !== "Secret") names.push(m[1]);
    }
    return names.sort();
  }
}

function writeGeneratedDeployConfig(
  livePlain: Record<string, string>,
  wranglerVars: Record<string, string>,
): void {
  const raw = readFileSync("wrangler.jsonc", "utf8");
  const base = JSON.parse(stripJsonc(raw)) as Record<string, unknown>;
  // Live version is SSOT for dashboard-managed plain vars.
  // Wrangler overlays only APP_ENV / CLOUDFLARE_ENV (and any new intentional keys).
  const mergedVars: Record<string, string> = {
    ...livePlain,
    ...wranglerVars,
    // Never let a stale wrangler CHECKOUT_ENABLED=false wipe live commerce.
    CHECKOUT_ENABLED: livePlain.CHECKOUT_ENABLED ?? wranglerVars.CHECKOUT_ENABLED ?? "true",
  };
  const generated = {
    ...base,
    keep_vars: true,
    vars: mergedVars,
    // Drop named envs from generated one-shot deploy config to avoid name remap.
    env: undefined,
  };
  delete generated.env;
  writeFileSync(GENERATED_CONFIG_PATH, JSON.stringify(generated, null, 2));
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`FAIL: missing ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = loadJson<Manifest>(MANIFEST_PATH);
  const declared = wranglerDeclaredVars();
  const livePlain = syncLivePlainVars();
  const livePlainNames = Object.keys(livePlain).sort();
  const secrets = remoteSecretNames();

  const wranglerRaw = JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8"))) as {
    vars?: Record<string, string>;
  };
  writeGeneratedDeployConfig(livePlain, wranglerRaw.vars ?? {});

  // Projected post-upload plain set with keep_vars + generated full vars:
  // generated config contains the full merge, so projected === keys(generated.vars)
  const generated = loadJson<{ vars: Record<string, string>; keep_vars: boolean }>(
    GENERATED_CONFIG_PATH,
  );
  const projectedPlain = new Set(Object.keys(generated.vars ?? {}));
  // keep_vars would also preserve any remote extras; we still require required ⊆ projected
  const missingPlain = manifest.required_plain_vars.filter((n) => !projectedPlain.has(n));
  const missingSecrets = manifest.required_secrets.filter((n) => !secrets.includes(n));

  const report = {
    ok: missingPlain.length === 0 && missingSecrets.length === 0,
    worker: WORKER,
    rollback_version: ROLLBACK_VERSION,
    keep_vars: true,
    wrangler_declared_vars: declared,
    live_plain_from_rollback_version: livePlainNames,
    projected_plain: [...projectedPlain].sort(),
    remote_secrets: secrets,
    missing_plain: missingPlain,
    missing_secrets: missingSecrets,
    generated_config: GENERATED_CONFIG_PATH,
    formula:
      "REQUIRED_LIVE − NEW_DEPLOYMENT_BINDINGS = empty (fail-closed)",
  };

  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync(
    path.join("docs", "evidence", "cf-predeploy-check.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error("FAIL: binding parity incomplete — refusing deploy");
    process.exit(1);
  }
  console.log("PASS: Cloudflare binding parity");
}

main();
