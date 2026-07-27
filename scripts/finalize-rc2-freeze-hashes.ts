/**
 * Finalize RC2 freeze SHA256SUMS + bundle checksums (local only).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const relDir = "contracts/releases/vdb-backend-contract-0.2.0-rc.2";

function sha(p: string) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

// Refresh checksums.json (exclude self + BUNDLE + SHA256SUMS while hashing content files)
const skip = new Set(["checksums.json", "BUNDLE_SHA256.txt", "SHA256SUMS"]);
const contentFiles = readdirSync(relDir)
  .filter((f) => !skip.has(f))
  .sort();
const checksums: Record<string, string> = {};
for (const f of contentFiles) checksums[f] = sha(join(relDir, f));
writeFileSync(join(relDir, "checksums.json"), JSON.stringify(checksums, null, 2) + "\n");

const allInBundle = readdirSync(relDir).sort();
const concat =
  allInBundle.map((f) => `${f}:${sha(join(relDir, f))}`).join("\n") + "\n";
const bundleSha = createHash("sha256").update(concat, "utf8").digest("hex");
writeFileSync(join(relDir, "BUNDLE_SHA256.txt"), bundleSha + "\n");

const freezeDoc = "docs/shared-backend-rc2-local-freeze.md";
const lines = [
  `${sha(join(relDir, "migrations.json"))}  migrations.json`,
  `${sha(join(relDir, "migrations.sha256"))}  migrations.sha256`,
  `${sha(join(relDir, "contract.json"))}  contract.json`,
  `${sha(join(relDir, "database.types.ts"))}  database.types.ts`,
  `${sha(join(relDir, "dependency-baseline.json"))}  dependency-baseline.json`,
  `${sha(join(relDir, "concurrency-results.json"))}  concurrency-results.json`,
  `${sha("package-lock.json")}  package-lock.json`,
  `${sha(freezeDoc)}  shared-backend-rc2-local-freeze.md`,
  `${bundleSha}  BUNDLE_SHA256.txt (bundle aggregate)`,
  `${sha(join(relDir, "checksums.json"))}  checksums.json`,
];
writeFileSync(join(relDir, "SHA256SUMS"), lines.join("\n") + "\n");

// Recompute bundle after SHA256SUMS added
const all2 = readdirSync(relDir).sort();
const concat2 = all2.map((f) => `${f}:${sha(join(relDir, f))}`).join("\n") + "\n";
const bundleSha2 = createHash("sha256").update(concat2, "utf8").digest("hex");
writeFileSync(join(relDir, "BUNDLE_SHA256.txt"), bundleSha2 + "\n");

// Update SHA256SUMS bundle line
const sums = readFileSync(join(relDir, "SHA256SUMS"), "utf8")
  .split("\n")
  .map((l) =>
    l.includes("BUNDLE_SHA256.txt (bundle aggregate)")
      ? `${bundleSha2}  BUNDLE_SHA256.txt (bundle aggregate)`
      : l,
  )
  .join("\n");
writeFileSync(join(relDir, "SHA256SUMS"), sums.endsWith("\n") ? sums : sums + "\n");

console.log(
  JSON.stringify(
    {
      bundleSha256: bundleSha2,
      migrationsJson: sha(join(relDir, "migrations.json")),
      migrationsSha256File: sha(join(relDir, "migrations.sha256")),
      databaseTypes: sha(join(relDir, "database.types.ts")),
      packageLock: sha("package-lock.json"),
      freezeDoc: sha(freezeDoc),
      fileCount: all2.length,
    },
    null,
    2,
  ),
);
