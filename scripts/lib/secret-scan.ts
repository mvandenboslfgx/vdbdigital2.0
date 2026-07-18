/**
 * Secret leakage scanner (pure library).
 * Patterns are assembled from fragments so this source file does not contain
 * contiguous secret marker strings that would self-match.
 *
 * Never logs matched secret values — only paths and rule ids.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export type SecretRuleId =
  | "supabase_secret_prefix"
  | "supabase_secret_env_assignment"
  | "supabase_service_role_jwt"
  | "supabase_publishable_assignment"
  | "mollie_live_key"
  | "mollie_test_key_long"
  | "standalone_mollie_live_token"
  | "generic_api_token_assignment"
  | "postgres_url_with_password"
  | "tawk_api_secret_hex";

export type SecretFinding = {
  ruleId: SecretRuleId;
  relativePath: string;
  line: number;
  /** Never the secret — only a safe label */
  evidence: string;
};

export type AllowlistEntry = {
  /** Repo-relative path using forward slashes */
  path: string;
  /** Exact line number (1-based), or null for whole-file allow when lineMustMatch is set */
  line: number | null;
  ruleId: SecretRuleId | "*";
  /** Line content must match this (source of allowlist justification) */
  lineMustMatch: RegExp;
  reason: string;
};

function frag(...parts: string[]): string {
  return parts.join("");
}

/** Contiguous patterns built at runtime from fragments (avoid self-match in this file). */
export function buildSecretRules(): Array<{ id: SecretRuleId; re: RegExp }> {
  const sb = "sb";
  const secret = "secret";
  const publishable = "publishable";
  const live = "live";
  const test = "test";
  const eyJ = "eyJ";

  return [
    {
      id: "supabase_secret_prefix",
      re: new RegExp(frag(sb, "_", secret, "_[A-Za-z0-9_-]{8,}")),
    },
    {
      id: "supabase_secret_env_assignment",
      re: new RegExp(
        frag(
          "SUPABASE_",
          secret.toUpperCase(),
          "_KEY=",
          sb,
          "_[A-Za-z0-9_-]+",
        ),
      ),
    },
    {
      id: "supabase_service_role_jwt",
      re: new RegExp(
        frag("SUPABASE_SERVICE_ROLE_KEY=", eyJ, "[A-Za-z0-9+/=_-]{20,}"),
      ),
    },
    {
      id: "supabase_publishable_assignment",
      // Only fail when a full-looking token follows — placeholders like CHANGE_ME stay safe
      re: new RegExp(
        frag("SUPABASE_PUBLISHABLE_KEY=", sb, "_", publishable, "_[A-Za-z0-9_-]{12,}"),
      ),
    },
    {
      id: "mollie_live_key",
      re: new RegExp(
        frag(
          "(?:MOLLIE[_A-Z0-9]*KEY|mollieApiKey|apiKey)\\s*[=:]\\s*[\"']?",
          live,
          "_[A-Za-z0-9]{16,}",
        ),
        "i",
      ),
    },
    {
      id: "mollie_test_key_long",
      re: new RegExp(
        frag(
          "(?:MOLLIE[_A-Z0-9]*KEY|mollieApiKey|apiKey)\\s*[=:]\\s*[\"']?",
          test,
          "_[A-Za-z0-9]{16,}",
        ),
        "i",
      ),
    },
    {
      id: "standalone_mollie_live_token",
      // Bare token form used in fixtures / accidental commits
      re: new RegExp(frag("(?<![A-Za-z0-9_])", live, "_[A-Za-z0-9]{28,}(?![A-Za-z0-9_])")),
    },
    {
      id: "generic_api_token_assignment",
      re: /(?:API_TOKEN|ACCESS_TOKEN|AUTH_TOKEN)=(?!["']?(?:CHANGE_ME|REPLACE_ME|your-|xxx|placeholder)["']?)[A-Za-z0-9_\-.]{24,}/i,
    },
    {
      id: "postgres_url_with_password",
      // Fail on real-looking passwords; allow obvious placeholders
      re: /postgres(?:ql)?:\/\/[^:\s/]+:(?![A-Za-z0-9_-]*(?:CHANGE_ME|REPLACE_ME|password|xxx|your-)[A-Za-z0-9_-]*@)[^@\s/]{4,}@/i,
    },
    {
      id: "tawk_api_secret_hex",
      re: /TAWK_API_SECRET=[0-9a-f]{20,}/i,
    },
  ];
}

/**
 * Exact minimal allowlist. Prefer fragmenting detector source instead of allowlisting.
 * Entries must justify non-leak matches (path + line + rule + lineMustMatch).
 */
export const SECRET_SCAN_ALLOWLIST: readonly AllowlistEntry[] = [];

export type ScanOptions = {
  root?: string;
  allowlist?: readonly AllowlistEntry[];
  /** Extra relative paths to skip entirely (never broad trees like scripts/) */
  skipPaths?: readonly string[];
};

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function isAllowlisted(
  finding: SecretFinding,
  allowlist: readonly AllowlistEntry[],
  lineText: string,
): boolean {
  return allowlist.some((entry) => {
    if (entry.path !== finding.relativePath) return false;
    if (entry.line !== null && entry.line !== finding.line) return false;
    if (entry.ruleId !== "*" && entry.ruleId !== finding.ruleId) return false;
    return entry.lineMustMatch.test(lineText);
  });
}

export function scanText(
  relativePath: string,
  content: string,
  options: ScanOptions = {},
): SecretFinding[] {
  const rules = buildSecretRules();
  const allowlist = options.allowlist ?? SECRET_SCAN_ALLOWLIST;
  const findings: SecretFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const rule of rules) {
      if (!rule.re.test(lineText)) continue;
      // Reset lastIndex for global-less regex — still safe
      rule.re.lastIndex = 0;
      const finding: SecretFinding = {
        ruleId: rule.id,
        relativePath: toPosix(relativePath),
        line: i + 1,
        evidence: `rule=${rule.id}`,
      };
      if (isAllowlisted(finding, allowlist, lineText)) continue;
      findings.push(finding);
    }
  }

  return findings;
}

export function listTrackedTextFiles(root: string): string[] {
  try {
    const out = execSync("git ls-files -z", {
      cwd: root,
      encoding: "buffer",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
    const text = out.toString("utf8");
    const exts = new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".md",
      ".json",
      ".sql",
      ".yml",
      ".yaml",
      ".toml",
      ".example",
    ]);
    return text
      .split("\0")
      .map((p) => p.trim())
      .filter(Boolean)
      .map(toPosix)
      .filter((p) => {
        if (p === ".env.example" || p.endsWith("/.env.example")) return true;
        const base = p.includes("/") ? p.slice(p.lastIndexOf("/") + 1) : p;
        if (base === ".env.example") return true;
        const dot = p.lastIndexOf(".");
        if (dot < 0) return false;
        return exts.has(p.slice(dot).toLowerCase());
      });
  } catch (error) {
    throw new Error(
      `FAIL Closed: unable to list tracked files via git (${error instanceof Error ? error.message : "unknown"})`,
    );
  }
}

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

export function isProbablyBinaryPath(path: string): boolean {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false;
  return BINARY_EXT.has(lower.slice(dot));
}

export type ScanReport = {
  ok: boolean;
  findings: SecretFinding[];
  scannedFiles: number;
  skippedBinary: number;
  readErrors: string[];
  allowlistSize: number;
};

export function scanRepository(options: ScanOptions = {}): ScanReport {
  const root = options.root ?? process.cwd();
  const skip = new Set((options.skipPaths ?? []).map(toPosix));
  // Never skip scanner itself via broad allow — only exact allowlist lines
  const files = listTrackedTextFiles(root);
  const findings: SecretFinding[] = [];
  const readErrors: string[] = [];
  let skippedBinary = 0;
  let scannedFiles = 0;

  for (const rel of files) {
    if (skip.has(rel)) continue;
    if (isProbablyBinaryPath(rel)) {
      skippedBinary += 1;
      continue;
    }
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      readErrors.push(rel);
      continue;
    }
    try {
      const st = statSync(abs);
      if (!st.isFile()) continue;
      // Fail closed on huge files — still try to read head for secrets
      const content = readFileSync(abs, "utf8");
      // Skip null-byte binary masquerading as text
      if (content.includes("\u0000")) {
        skippedBinary += 1;
        continue;
      }
      scannedFiles += 1;
      findings.push(...scanText(rel, content, options));
    } catch {
      readErrors.push(rel);
    }
  }

  const ok = findings.length === 0 && readErrors.length === 0;
  return {
    ok,
    findings,
    scannedFiles,
    skippedBinary,
    readErrors,
    allowlistSize: (options.allowlist ?? SECRET_SCAN_ALLOWLIST).length,
  };
}

export function formatScanReport(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(
    `Secret scan: scanned=${report.scannedFiles} binary_skipped=${report.skippedBinary} allowlist=${report.allowlistSize}`,
  );
  for (const err of report.readErrors) {
    lines.push(`FAIL Closed: unreadable file: ${err}`);
  }
  for (const f of report.findings) {
    lines.push(
      `FAIL Possible secret (${f.ruleId}) in ${f.relativePath}:${f.line} [${f.evidence}]`,
    );
  }
  if (report.ok) {
    lines.push("PASS Secret scan clean");
  }
  return lines.join("\n");
}

/** Helpers for tests — build example secret strings without storing them in fixtures. */
export function testOnlyAssemble(parts: string[]): string {
  return parts.join("");
}

export function resolveRelative(root: string, absPath: string): string {
  return toPosix(relative(root, absPath));
}
