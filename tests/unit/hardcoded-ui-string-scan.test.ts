import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * SEO/i18n debt guard: catches literal Dutch or English UI copy hardcoded
 * directly in customer-facing components/pages instead of routed through
 * `t()` / the i18n dictionaries. This is a regression guard, not a full
 * translation linter — it uses a curated phrase list that has near-zero
 * false positives, plus a file-level allowlist for known existing debt
 * (`tests/unit/hardcoded-ui-allowlist.txt`).
 *
 * New files (or newly-touched files not already on the allowlist) that
 * introduce one of these phrases fail the test — that's the point: it stops
 * *new* hardcoded copy from landing while we work through the backlog.
 */

const REPO_ROOT = process.cwd();

/** Directories whose customer-facing surface must not hardcode UI copy. */
const SCAN_ROOTS = [join(REPO_ROOT, "src", "app"), join(REPO_ROOT, "src", "components")];

/**
 * Directories that are either translation *sources of truth* (expected to
 * contain literal copy) or documented internal/staff-only surfaces that are
 * intentionally single-locale (Dutch) per `docs/I18N_ARCHITECTURE.md`.
 */
const EXCLUDED_DIR_SEGMENTS = [
  `${join("src", "i18n", "messages")}`,
  `${join("src", "i18n", "content")}`,
  `${join("src", "app", "admin")}`,
  `${join("src", "components", "admin")}`,
];

const SCANNABLE_EXTENSIONS = new Set([".tsx", ".ts"]);
const EXCLUDED_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".stories.tsx", ".d.ts"];

/**
 * Curated, low-noise hardcoded UI phrases.
 * Multi-word phrases are case-insensitive (near-zero odds of matching a path
 * or identifier). Single Dutch words are matched case-sensitively, requiring
 * a capitalized first letter — the typical convention for visible button/
 * label text — so they don't match lowercase route segments like
 * `href="/uitloggen"`.
 */
const DUTCH_UI_PATTERNS: RegExp[] = [
  /\bKlik hier\b/i,
  /\bMeer informatie\b/i,
  /\bLees meer\b/i,
  /\bWelkom terug\b/i,
  /\bWachtwoord vergeten\b/i,
  /\bVerzenden\b/,
  /\bAanmelden\b/,
  /\bUitloggen\b/,
  /\bNeem contact op\b/i,
  /\bVraag een offerte aan\b/i,
  /\bBekijk alle\b/i,
  /\bOnze diensten\b/i,
  /\bMeer weten\b/i,
  /\bBel ons\b/i,
  /\bStuur bericht\b/i,
  /\bOntdek meer\b/i,
];

const ENGLISH_UI_PATTERNS: RegExp[] = [
  /\bClick here\b/i,
  /\bRead more\b/i,
  /\bLearn more\b/i,
  /\bSign up now\b/i,
  /\bSubmit now\b/i,
  /\bGet started now\b/i,
  /\bContact us today\b/i,
];

const UI_PATTERNS = [...DUTCH_UI_PATTERNS, ...ENGLISH_UI_PATTERNS];

function toRepoRelativePosix(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath).split("\\").join("/");
}

function isExcludedDir(absoluteDirPath: string): boolean {
  const relPath = relative(REPO_ROOT, absoluteDirPath);
  return EXCLUDED_DIR_SEGMENTS.some(
    (segment) =>
      relPath === segment ||
      relPath.startsWith(`${segment}/`) ||
      relPath.startsWith(`${segment}\\`),
  );
}

function isExcludedFile(fileName: string): boolean {
  return EXCLUDED_FILE_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

function collectScannableFiles(dir: string, acc: string[] = []): string[] {
  if (isExcludedDir(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectScannableFiles(full, acc);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf("."));
    if (!SCANNABLE_EXTENSIONS.has(ext)) continue;
    if (isExcludedFile(entry)) continue;
    acc.push(full);
  }
  return acc;
}

function loadAllowlist(): Set<string> {
  const raw = readFileSync(
    join(REPO_ROOT, "tests", "unit", "hardcoded-ui-allowlist.txt"),
    "utf8",
  );
  return new Set(
    raw
      .split("\n")
      .map((line) => line.split("#")[0]!.trim())
      .filter((line) => line.length > 0),
  );
}

interface Violation {
  file: string;
  line: number;
  match: string;
}

function findViolations(absoluteFile: string, repoRelativeFile: string): Violation[] {
  const source = readFileSync(absoluteFile, "utf8");
  const lines = source.split("\n");
  const violations: Violation[] = [];
  lines.forEach((line, index) => {
    for (const pattern of UI_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        violations.push({ file: repoRelativeFile, line: index + 1, match: match[0] });
      }
    }
  });
  return violations;
}

describe("SEO-006 hardcoded UI string scan", () => {
  const files = SCAN_ROOTS.flatMap((root) => collectScannableFiles(root)).map(
    toRepoRelativePosix,
  );

  it("finds customer-facing files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  const allowlist = loadAllowlist();

  it("keeps the allowlist free of stale entries", () => {
    for (const entry of allowlist) {
      expect(files, `${entry} is allowlisted but no longer exists/matches scan roots`).toContain(
        entry,
      );
    }
  });

  it("has no new hardcoded Dutch/English UI copy outside the allowlist", () => {
    const newViolations: Violation[] = [];
    for (const file of files) {
      if (allowlist.has(file)) continue;
      const absolute = join(REPO_ROOT, file);
      newViolations.push(...findViolations(absolute, file));
    }

    if (newViolations.length > 0) {
      const detail = newViolations
        .map((v) => `${v.file}:${v.line} → "${v.match}"`)
        .join("\n");
      throw new Error(
        `Found ${newViolations.length} new hardcoded UI string(s) outside the allowlist. ` +
          `Route this copy through the i18n dictionary, or if it is genuinely known debt, ` +
          `add the file to tests/unit/hardcoded-ui-allowlist.txt with a short justification.\n${detail}`,
      );
    }

    expect(newViolations).toHaveLength(0);
  });
});
