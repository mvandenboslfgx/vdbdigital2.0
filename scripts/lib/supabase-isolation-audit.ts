/**
 * Shared read-only helpers for Supabase isolation audits.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  APPROVED_CASE_KEYWORDS,
  FOREIGN_PROJECT_KEYWORDS,
  VDB_APPROVED_PROJECT_REF,
  classifyKeywordHit,
  extractSupabaseProjectRefs,
  isApprovedProjectRef,
  isWriteSql,
  keywordContextForRepoPath,
  type IsolationClassification,
} from "../../config/supabase-project-isolation-allowlist";

export type Finding = {
  area: string;
  subject: string;
  classification: IsolationClassification;
  detail: string;
  blocker: boolean;
};

const SKIP_DIR = new Set([
  ".next",
  "node_modules",
  "docs/evidence",
  "backups",
  "review-package",
  "test-results",
  "playwright-report",
  ".git",
  "coverage",
  "supabase/.temp",
  "supabase/.branches",
  "supabase/dump",
]);

const SCAN_ROOTS = [
  "src",
  "supabase",
  "scripts",
  "tests",
  "docs",
  "public",
  "config",
  "package.json",
  "package-lock.json",
  "vercel.json",
  ".env.example",
  ".github",
];

function shouldSkip(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  for (const s of SKIP_DIR) {
    if (n === s || n.startsWith(`${s}/`)) return true;
  }
  return false;
}

function walkFiles(root: string, acc: string[] = []): string[] {
  const abs = resolve(process.cwd(), root);
  if (!existsSync(abs)) return acc;
  const st = statSync(abs);
  if (st.isFile()) {
    acc.push(abs);
    return acc;
  }
  for (const name of readdirSync(abs)) {
    const child = join(abs, name);
    const rel = relative(process.cwd(), child).replace(/\\/g, "/");
    if (shouldSkip(rel)) continue;
    const cst = statSync(child);
    if (cst.isDirectory()) walkFiles(rel, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|toml|yml|yaml|sql|env\.example)$/i.test(name)) {
      acc.push(child);
    }
  }
  return acc;
}

export function scanRepositoryProjectRefs(): Finding[] {
  const findings: Finding[] = [];
  const files = SCAN_ROOTS.flatMap((r) => walkFiles(r));
  for (const file of files) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // Skip huge lockfiles body spam — still check for supabase URLs
    if (rel.endsWith("package-lock.json") && text.length > 500_000) {
      text = text.slice(0, 200_000);
    }
    const refs = extractSupabaseProjectRefs(text);
    for (const ref of refs) {
      if (isApprovedProjectRef(ref)) {
        findings.push({
          area: "repository",
          subject: rel,
          classification: "VDB_CORE",
          detail: `approved project ref ${ref}`,
          blocker: false,
        });
      } else {
        findings.push({
          area: "repository",
          subject: rel,
          classification: "SECURITY_BLOCKER",
          detail: `foreign/unknown project ref ${ref.slice(0, 4)}…${ref.slice(-4)}`,
          blocker: true,
        });
      }
    }
    const kwContext = keywordContextForRepoPath(rel);
    const keywords = [...FOREIGN_PROJECT_KEYWORDS, ...APPROVED_CASE_KEYWORDS];
    for (const kw of keywords) {
      if (text.toLowerCase().includes(kw)) {
        // Audit tooling / allowlist intentionally list names — not runtime pollution.
        if (
          rel.startsWith("config/supabase-project-isolation") ||
          rel.startsWith("scripts/audit-supabase") ||
          rel.startsWith("scripts/lib/supabase-isolation") ||
          rel.startsWith("tests/unit/supabase-isolation") ||
          rel.startsWith("docs/SUPABASE_ISOLATION") ||
          rel.startsWith("docs/evidence/")
        ) {
          continue;
        }
        const cls = classifyKeywordHit(kw, kwContext);
        findings.push({
          area: "repository-keyword",
          subject: rel,
          classification: cls,
          detail: `keyword hit: ${kw} (context=${kwContext})`,
          blocker: cls === "FOREIGN_PROJECT_DATA" || cls === "SECURITY_BLOCKER",
        });
      }
    }
  }
  return findings;
}

export function assertReadOnlySql(sql: string): void {
  if (isWriteSql(sql)) {
    throw new Error("READ_ONLY_GUARD: write SQL blocked");
  }
}

export function runLocalDockerSelect(sql: string): {
  ok: boolean;
  rows: string[][];
  error?: string;
} {
  assertReadOnlySql(sql);
  try {
    const out = execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_vdbdigital2",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-F",
        "\t",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        encoding: "utf8",
        input: sql,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      },
    );
    const rows = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split("\t"));
    return { ok: true, rows };
  } catch (err) {
    return {
      ok: false,
      rows: [],
      error: err instanceof Error ? err.message.slice(0, 200) : "query failed",
    };
  }
}

export function validateEnvProjectRef(): {
  ok: boolean;
  ref: string | null;
  detail: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const m = url.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i);
  const ref = m?.[1]?.toLowerCase() ?? null;
  if (!ref) {
    return { ok: false, ref: null, detail: "missing or unverified Supabase URL" };
  }
  if (!isApprovedProjectRef(ref)) {
    return {
      ok: false,
      ref,
      detail: `wrong project ref (expected ${VDB_APPROVED_PROJECT_REF})`,
    };
  }
  return { ok: true, ref, detail: "project ref matches allowlist" };
}

export function writeEvidence(filename: string, body: string): string {
  const dir = resolve(process.cwd(), "docs/evidence");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, body, "utf8");
  return path;
}

export function sha256Short(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

export function summarizeFindings(findings: Finding[]) {
  const blockers = findings.filter((f) => f.blocker);
  const reviews = findings.filter(
    (f) =>
      !f.blocker &&
      (f.classification === "AMBIGUOUS_REVIEW_REQUIRED" ||
        f.classification === "FOREIGN_PROJECT_DATA" ||
        f.classification === "TEST_FIXTURE"),
  );
  // Deduplicate repository VDB_CORE noise
  const uniqueBlockers = [...new Map(blockers.map((b) => [`${b.subject}:${b.detail}`, b])).values()];
  const uniqueReviews = [...new Map(reviews.map((b) => [`${b.subject}:${b.detail}`, b])).values()];
  return { blockers: uniqueBlockers, reviews: uniqueReviews };
}
