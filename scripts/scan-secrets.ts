/**
 * Secret-lekkage scan — print nooit gevonden waarden.
 * Gebruik: npm run env:scan-secrets
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
let failed = false;

function pass(msg: string): void {
  console.log(`PASS ${msg}`);
}

function fail(msg: string): void {
  failed = true;
  console.error(`FAIL ${msg}`);
}

function grep(pattern: string, paths: string[]): string[] {
  try {
    const cmd = `git grep -n -E "${pattern}" -- ${paths.join(" ")}`;
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// .gitignore
const gitignore = readFileSync(resolve(ROOT, ".gitignore"), "utf8");
if (gitignore.includes(".env*") || gitignore.includes(".env.local")) {
  pass(".env.local ignored by git");
} else {
  fail(".env.local not in .gitignore");
}

// .env.example placeholders only
const example = readFileSync(resolve(ROOT, ".env.example"), "utf8");
if (/(test_[a-zA-Z0-9]{10,}|sb_publishable_[a-zA-Z0-9_-]+|sb_secret_[a-zA-Z0-9_-]+|eyJ[A-Za-z0-9+/=]{30,})/.test(example)) {
  fail(".env.example may contain real secrets");
} else {
  pass(".env.example uses placeholders");
}

// Tracked secret patterns (file:line only, no values from grep output beyond path)
const secretPatterns = [
  "sb_secret_",
  "SUPABASE_SECRET_KEY=sb_",
  "SUPABASE_SERVICE_ROLE_KEY=eyJ",
  "TAWK_API_SECRET=[0-9a-f]{20,}",
];

for (const pattern of secretPatterns) {
  const hits = grep(pattern, ["*.ts", "*.tsx", "*.md", "*.json", ".env.example"]);
  if (hits.length > 0 && !hits.every((h) => h.startsWith(".env.example:"))) {
    const safe = hits.map((h) => h.split(":").slice(0, 2).join(":"));
    fail(`Possible secret in tracked files: ${safe.join(", ")}`);
  }
}

// Client code must not reference secret env names
const clientHits = grep(
  "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_",
  ["src/components", "src/lib/database/client.ts", "src/app"],
);
const serverOnlyHits = clientHits.filter(
  (h) =>
    !h.includes("src/lib/database/admin.ts") &&
    !h.includes("src/lib/database/server.ts") &&
    !h.includes("src/config/env.ts") &&
    !h.includes("instellingen") &&
    !h.includes("login/page") &&
    !h.includes("runtime/environment"),
);
if (serverOnlyHits.length > 0) {
  fail(`Secret key referenced in client-facing paths: ${serverOnlyHits.map((h) => h.split(":")[0]).join(", ")}`);
} else {
  pass("No secret key imports in client components");
}

// .env.local must not be tracked
if (existsSync(resolve(ROOT, ".env.local"))) {
  try {
    execSync("git ls-files --error-unmatch .env.local", { cwd: ROOT, stdio: "pipe" });
    fail(".env.local is tracked by git");
  } catch {
    pass(".env.local not tracked by git");
  }
}

process.exit(failed ? 1 : 0);
