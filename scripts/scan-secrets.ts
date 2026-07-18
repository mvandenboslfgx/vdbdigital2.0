/**
 * Secret-lekkage scan — print nooit gevonden waarden.
 * Gebruik: npm run env:scan-secrets
 *
 * Fail-closed: git listing/read errors → exit 1.
 * Allowlist is exact (path + line + rule + lineMustMatch) — no broad tree excludes.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatScanReport, scanRepository, scanText } from "./lib/secret-scan";

const ROOT = process.cwd();
let failed = false;

function pass(msg: string): void {
  console.log(`PASS ${msg}`);
}

function fail(msg: string): void {
  failed = true;
  console.error(`FAIL ${msg}`);
}

try {
  const gitignore = readFileSync(resolve(ROOT, ".gitignore"), "utf8");
  if (gitignore.includes(".env*") || gitignore.includes(".env.local")) {
    pass(".env.local ignored by git");
  } else {
    fail(".env.local not in .gitignore");
  }
} catch {
  fail("Closed: unable to read .gitignore");
}

try {
  const example = readFileSync(resolve(ROOT, ".env.example"), "utf8");
  const exampleFindings = scanText(".env.example", example);
  if (exampleFindings.length > 0) {
    fail(
      `.env.example may contain real secrets (${exampleFindings.map((f) => f.ruleId).join(", ")})`,
    );
  } else {
    pass(".env.example uses placeholders");
  }
} catch {
  fail("Closed: unable to read .env.example");
}

let report;
try {
  report = scanRepository({ root: ROOT });
  console.log(formatScanReport(report));
  if (!report.ok) failed = true;
  else pass("Tracked repository secret scan");
} catch (error) {
  fail(error instanceof Error ? error.message : "Closed: scan failed");
  process.exit(1);
}

if (existsSync(resolve(ROOT, ".env.local"))) {
  try {
    execSync("git ls-files --error-unmatch .env.local", { cwd: ROOT, stdio: "pipe" });
    fail(".env.local is tracked by git");
  } catch {
    pass(".env.local not tracked by git");
  }
}

process.exit(failed ? 1 : 0);
