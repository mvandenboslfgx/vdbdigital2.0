/**
 * Build already done → upload a Worker VERSION (no traffic cutover).
 * Uses generated wrangler config with full plain-var parity + keep_vars.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const GENERATED = ".wrangler.deploy.generated.json";
const CHECK = path.join("docs", "evidence", "cf-predeploy-check.json");
const ALIAS =
  process.env.CF_PREVIEW_ALIAS ||
  `candidate-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
const MESSAGE =
  process.env.CF_UPLOAD_MESSAGE ||
  "SAFE-upload-binding-parity-candidate-no-traffic";

function main() {
  if (!existsSync(CHECK)) {
    console.error("FAIL: run npm run cf:predeploy-check first");
    process.exit(1);
  }
  const check = JSON.parse(readFileSync(CHECK, "utf8")) as { ok?: boolean };
  if (!check.ok) {
    console.error("FAIL: predeploy check not green");
    process.exit(1);
  }
  if (!existsSync(GENERATED)) {
    console.error(`FAIL: missing ${GENERATED}`);
    process.exit(1);
  }
  if (!existsSync(path.join(".open-next", "worker.js"))) {
    console.error("FAIL: missing .open-next/worker.js — run npm run cf:build first");
    process.exit(1);
  }

  const wranglerJs = path.join("node_modules", "wrangler", "bin", "wrangler.js");
  const args = [
    wranglerJs,
    "versions",
    "upload",
    "-c",
    GENERATED,
    "--keep-vars",
    "--preview-alias",
    ALIAS,
    "--message",
    MESSAGE,
  ];
  console.log("Running: node", args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" "));
  const r = spawnSync(process.execPath, args, {
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
    env: {
      ...process.env,
      OPEN_NEXT_DEPLOY: "true",
    },
  });
  process.exit(r.status ?? 1);
}

main();
