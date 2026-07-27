import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

mkdirSync(resolve("docs/evidence/rc2-local-freeze"), { recursive: true });

const raw = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--local"],
  { encoding: "buffer", maxBuffer: 20 * 1024 * 1024, shell: true },
);

const generatedPath = resolve(
  "docs/evidence/rc2-local-freeze/database.types.generated.ts",
);
writeFileSync(generatedPath, raw);

const trackedPath = resolve(
  "contracts/releases/vdb-backend-contract-0.2.0-rc.2/database.types.ts",
);

function normalize(buf: Buffer): Buffer {
  let s = buf.toString("utf8");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n/g, "\n");
  if (!s.endsWith("\n")) s += "\n";
  return Buffer.from(s, "utf8");
}

const tracked = normalize(readFileSync(trackedPath));
const generated = normalize(raw);
const trackedSha = createHash("sha256").update(tracked).digest("hex");
const generatedSha = createHash("sha256").update(generated).digest("hex");
const equal = Buffer.compare(tracked, generated) === 0;

const report = {
  equalNormalized: equal,
  trackedSha256: trackedSha,
  generatedSha256: generatedSha,
  trackedBytes: tracked.length,
  generatedBytes: generated.length,
  verdict: equal
    ? "BACKEND CONTRACT RC2 FINAL DRIFT CHECK PASS"
    : "BACKEND CONTRACT RC2 FINAL DRIFT CHECK FAIL",
};

writeFileSync(
  resolve("docs/evidence/rc2-local-freeze/types-drift.json"),
  JSON.stringify(report, null, 2) + "\n",
);

console.log(JSON.stringify(report, null, 2));

if (!equal) {
  // Show first differing lines for diagnosis
  const a = tracked.toString("utf8").split("\n");
  const b = generated.toString("utf8").split("\n");
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log(`diff@${i}:`);
      console.log("  tracked:", JSON.stringify((a[i] ?? "").slice(0, 120)));
      console.log("  generated:", JSON.stringify((b[i] ?? "").slice(0, 120)));
      shown++;
      if (shown >= 12) break;
    }
  }
  console.log("lineCounts", a.length, b.length);
}
