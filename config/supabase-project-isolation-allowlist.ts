/**
 * Explicit allowlist for Supabase project isolation audits.
 * No PII, tokens, or customer addresses.
 * Unknown objects are NEVER auto-approved.
 */
export const VDB_APPROVED_PROJECT_REF = "nhsrdnjfsxfikfbdmdfj" as const;
export const VDB_APPROVED_PROJECT_NAME = "vdb nieuw" as const;
export const VDB_APPROVED_REGION = "eu-west-1" as const;

export const VDB_APPROVED_DOMAINS = [
  "vdbdigital.nl",
  // Alias only: apex https://vdbdigital.nl is canonical; www must redirect to apex.
  // Do not use www for Auth Site URL, NEXT_PUBLIC_APP_URL, or production webhooks.
  "www.vdbdigital.nl",
  "vermeulenbouwservice.nl",
  "www.vermeulenbouwservice.nl",
  "grillgasten.eu",
  "www.grillgasten.eu",
] as const;

export const VDB_APPROVED_BUCKETS = [
  "customer-documents",
  "project-files",
  "quote-documents",
  "invoice-documents",
  "support-attachments",
  "product-media",
  "avatars",
] as const;

export const VDB_APPROVED_SCHEMAS = [
  "public",
  "storage",
  "auth",
  "extensions",
  "graphql_public",
  "realtime",
  "supabase_functions",
  "vault",
  "pgbouncer",
  "cron",
  "net",
] as const;

/** Known separate software projects / brands (not auto-customer). */
export const FOREIGN_PROJECT_KEYWORDS = [
  "trustbooker",
  "de elektricien",
  "de-elektricien",
  "kluspronow",
  "kluspro",
  "tvelio",
  "casanovio",
  "mthuis",
  "smartbtvo",
  "smart btvo",
  "nowrox",
  "nurox",
  "astreon",
  "bosbro",
  "lfgx",
  "tvelio store",
] as const;

/**
 * Portfolio / customer case brands only.
 * Never treat these as approved platform schema, buckets, or config.
 */
export const APPROVED_CASE_KEYWORDS = [
  "vermeulen bouwservice",
  "vermeulenbouwservice",
  "grill gasten",
  "grillgasten",
  "grill-gasten",
  "trustbooker",
] as const;

export type IsolationClassification =
  | "VDB_CORE"
  | "LEGITIMATE_CUSTOMER"
  | "APPROVED_CASE"
  | "VDB_LEGACY"
  | "SYSTEM_MANAGED"
  | "TEST_FIXTURE"
  | "FOREIGN_PROJECT_DATA"
  | "AMBIGUOUS_REVIEW_REQUIRED"
  | "SECURITY_BLOCKER";

export function isApprovedProjectRef(ref: string | null | undefined): boolean {
  return Boolean(ref && ref.trim() === VDB_APPROVED_PROJECT_REF);
}

export function extractSupabaseProjectRefs(text: string): string[] {
  const refs = new Set<string>();
  const urlRe =
    /https?:\/\/([a-z0-9]{20})\.supabase\.co/gi;
  const bareRe = /\b([a-z0-9]{20})\b/g;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    refs.add(m[1].toLowerCase());
  }
  // Only treat 20-char tokens near supabase context as refs
  if (/supabase/i.test(text)) {
    while ((m = bareRe.exec(text)) !== null) {
      const token = m[1].toLowerCase();
      if (token === VDB_APPROVED_PROJECT_REF || /supabase/i.test(text)) {
        // Avoid flooding: only add if appears in supabase URL pattern already handled,
        // or explicit PROJECT_REF / project-ref context within 40 chars
        const start = Math.max(0, m.index - 40);
        const window = text.slice(start, m.index + 40);
        if (/supabase\.co|project[_-]ref\b|PROJECT_REF\b|NEXT_PUBLIC_SUPABASE/i.test(window)) {
          refs.add(token);
        }
      }
    }
  }
  return [...refs];
}

export function classifyKeywordHit(
  value: string,
  context: "platform" | "organization" | "product" | "bucket" | "config",
): IsolationClassification {
  const lower = value.toLowerCase();

  for (const k of APPROVED_CASE_KEYWORDS) {
    if (lower.includes(k)) {
      // Approved as portfolio/customer case only — never as platform data.
      if (
        context === "platform" ||
        context === "bucket" ||
        context === "config"
      ) {
        return "FOREIGN_PROJECT_DATA";
      }
      return "APPROVED_CASE";
    }
  }

  if (
    lower.includes("vdb digital") ||
    lower.includes("vdbdigital") ||
    lower.includes("vdbdigital.nl")
  ) {
    return "VDB_CORE";
  }

  for (const k of FOREIGN_PROJECT_KEYWORDS) {
    if (lower.includes(k)) {
      if (context === "organization") return "AMBIGUOUS_REVIEW_REQUIRED";
      if (context === "platform" || context === "bucket" || context === "config") {
        return "FOREIGN_PROJECT_DATA";
      }
      return "AMBIGUOUS_REVIEW_REQUIRED";
    }
  }

  return "AMBIGUOUS_REVIEW_REQUIRED";
}

/** Repository path → keyword context (cases ≠ platform). */
export function keywordContextForRepoPath(
  relPath: string,
): "platform" | "organization" | "product" | "bucket" | "config" {
  const p = relPath.replace(/\\/g, "/").toLowerCase();

  // Platform / infra surfaces — approved case brands here are pollution.
  if (
    p.startsWith("supabase/") ||
    p.includes("storage.buckets") ||
    p.startsWith(".env") ||
    p.includes("auth/require") ||
    p.includes("create-service-client") ||
    p.includes("create-admin-client")
  ) {
    return p.includes("bucket") ? "bucket" : "platform";
  }

  // Marketing, portfolio, case docs/tests, commercial catalog → product/case context.
  if (
    p.includes("case") ||
    p.includes("portfolio") ||
    p.includes("commercial") ||
    p.includes("sitemap") ||
    p.includes("site-browser") ||
    p.includes("vermeulen") ||
    p.includes("grill") ||
    p.includes("trustbooker") ||
    p.startsWith("docs/") ||
    p.startsWith("public/") ||
    p.startsWith("scripts/capture") ||
    p.startsWith("src/app/(marketing)/") ||
    p.startsWith("src/components/sections/") ||
    p.startsWith("src/components/cases/") ||
    p.startsWith("src/i18n/")
  ) {
    return "product";
  }

  return "platform";
}

export function isWriteSql(sql: string): boolean {
  const normalized = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  // Allow SELECT / WITH ... SELECT / SHOW / EXPLAIN
  if (
    /^(with\b[\s\S]*\bselect\b|select\b|show\b|explain\b)/i.test(normalized)
  ) {
    // Reject if mutation keywords appear as statements
    if (
      /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|do|copy|vacuum|reindex|cluster|refresh\s+materialized)\b/i.test(
        normalized,
      )
    ) {
      // SELECT ... FOR UPDATE is still a write-intent lock — block
      if (/\bfor\s+update\b|\bfor\s+share\b/i.test(normalized)) return true;
      // CTEs that mutate
      if (
        /\b(insert|update|delete|truncate)\b/i.test(normalized) &&
        !/\bselect\b[\s\S]*\bfrom\b/i.test(normalized.split(/\b(insert|update|delete)\b/i)[0] ?? "")
      ) {
        return true;
      }
      if (/\b(insert|update|delete|truncate)\s+into\b/i.test(normalized)) {
        return true;
      }
      if (/\b(insert|update|delete|truncate)\b/i.test(normalized)) return true;
    }
    return false;
  }
  return true;
}

export function maskEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "(invalid)";
  return email.slice(at + 1).toLowerCase();
}

export function assertNoSecretLeak(report: string): void {
  if (
    /service_role|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.|postgres:\/\/[^:]+:[^@]+@/i.test(
      report,
    )
  ) {
    throw new Error("SECRET_LEAK_IN_REPORT");
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(report)) {
    // Allow domain-only lines like "example.nl — 3"
    const emails = report.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
    if (emails.length > 0) {
      throw new Error("PII_EMAIL_IN_REPORT");
    }
  }
}

export function isApprovedBucket(name: string): boolean {
  return (VDB_APPROVED_BUCKETS as readonly string[]).includes(name);
}

export function verdictFromFindings(input: {
  blocked: boolean;
  blockers: number;
  reviews: number;
}):
  | "SUPABASE ISOLATION AUDIT PASS"
  | "SUPABASE ISOLATION AUDIT CONDITIONAL PASS"
  | "SUPABASE ISOLATION AUDIT FAIL"
  | "SUPABASE ISOLATION AUDIT BLOCKED" {
  if (input.blocked) return "SUPABASE ISOLATION AUDIT BLOCKED";
  if (input.blockers > 0) return "SUPABASE ISOLATION AUDIT FAIL";
  if (input.reviews > 0) return "SUPABASE ISOLATION AUDIT CONDITIONAL PASS";
  return "SUPABASE ISOLATION AUDIT PASS";
}
