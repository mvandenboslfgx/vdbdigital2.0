/**
 * Recompute checksums.json + BUNDLE_SHA256.txt for the rc.5 contract bundle.
 * Local only. No publish, no remote, no secrets.
 *
 * Both digests reproduce the rc.4 scheme exactly:
 *   checksums.json   — { "<file>": sha256(file bytes) } for every bundle file except
 *                      checksums.json and BUNDLE_SHA256.txt, keys sorted ascending.
 *   BUNDLE_SHA256.txt — sha256 of "<file>:<sha256>" lines joined by "\n" plus a
 *                      trailing "\n", over the same file set.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BUNDLE_DIR = resolve("contracts/releases/vdb-backend-contract-0.2.0-rc.5");
const CONTRACT_VERSION = "vdb-backend-contract@0.2.0-rc.5";
const SCHEMA_VERSION = "2026.07.29.partner-identity-directory-rc5";
const EXCLUDED = new Set(["checksums.json", "BUNDLE_SHA256.txt"]);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  const files = readdirSync(BUNDLE_DIR)
    .filter((f) => !EXCLUDED.has(f))
    .sort();

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const parsed = JSON.parse(readFileSync(join(BUNDLE_DIR, f), "utf8")) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      throw new Error(`${f} is not a JSON object`);
    }
  }

  const manifest = JSON.parse(
    readFileSync(join(BUNDLE_DIR, "manifest.json"), "utf8"),
  ) as { contractVersion: string; schemaVersion: string };
  if (manifest.contractVersion !== CONTRACT_VERSION) {
    throw new Error(`manifest contractVersion=${manifest.contractVersion}`);
  }
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`manifest schemaVersion=${manifest.schemaVersion}`);
  }

  const checksums: Record<string, string> = {};
  for (const f of files) {
    checksums[f] = sha256File(join(BUNDLE_DIR, f));
  }
  writeFileSync(
    join(BUNDLE_DIR, "checksums.json"),
    JSON.stringify(checksums, null, 2) + "\n",
    "utf8",
  );

  const bundleConcat = files.map((f) => `${f}:${checksums[f]}`).join("\n");
  const bundleSha = createHash("sha256")
    .update(bundleConcat + "\n")
    .digest("hex");
  writeFileSync(join(BUNDLE_DIR, "BUNDLE_SHA256.txt"), `${bundleSha}\n`, "utf8");

  console.log(`files=${files.length}`);
  console.log(`TYPES_SHA256=${checksums["database.types.ts"]}`);
  console.log(`BUNDLE_SHA256=${bundleSha}`);
}

main();
