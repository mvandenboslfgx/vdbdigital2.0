/**
 * npm run audit:supabase-foreign-data
 * Batched keyword scan — single docker/psql round-trip (read-only).
 */
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  FOREIGN_PROJECT_KEYWORDS,
  APPROVED_CASE_KEYWORDS,
  classifyKeywordHit,
  verdictFromFindings,
} from "../config/supabase-project-isolation-allowlist";
import {
  runLocalDockerSelect,
  validateEnvProjectRef,
  writeEvidence,
  type Finding,
} from "./lib/supabase-isolation-audit";
import { execFileSync } from "node:child_process";

loadEnvLocal();

const PRIORITY_TABLES = [
  "organizations",
  "organization_members",
  "profiles",
  "products",
  "product_translations",
  "categories",
  "addons",
  "leads",
  "customers",
  "case_studies",
  "portal_projects",
  "portal_quotes",
  "portal_invoices",
  "portal_files",
  "portal_notifications",
  "portal_messages",
  "portal_support_tickets",
  "site_settings",
] as const;

function main() {
  console.log("=== audit:supabase-foreign-data (read-only) ===");
  if (isDirectCheckoutEnabled()) {
    console.log("SUPABASE ISOLATION AUDIT FAIL");
    process.exit(1);
  }
  const env = validateEnvProjectRef();
  if (!env.ok) {
    console.log("RESULT: FAIL — wrong or unverified Supabase project");
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    process.exit(1);
  }

  const existing = runLocalDockerSelect(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  if (!existing.ok) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log(existing.error);
    process.exit(1);
  }
  const present = new Set(existing.rows.map((r) => r[0]));
  const tables = PRIORITY_TABLES.filter((t) => present.has(t));
  const skipped = PRIORITY_TABLES.length - tables.length;
  for (const t of PRIORITY_TABLES) {
    if (!present.has(t)) console.log(`  skip missing table: ${t}`);
  }

  const keywords = [...FOREIGN_PROJECT_KEYWORDS, ...APPROVED_CASE_KEYWORDS];
  const sqlParts: string[] = [];
  for (const table of tables) {
    for (const kw of keywords) {
      const pattern = kw.replace(/'/g, "''");
      sqlParts.push(
        `SELECT 'hit', '${table}', '${pattern}', (SELECT count(*) FROM public."${table}" t WHERE t::text ILIKE '%${pattern}%');`,
      );
    }
  }

  const sql = sqlParts.join("\n");
  if (
    /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke)\b/i.test(
      sql,
    )
  ) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log("write SQL blocked by guard");
    process.exit(1);
  }

  let out = "";
  try {
    out = execFileSync(
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
        timeout: 180_000,
      },
    );
  } catch (err) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log(err instanceof Error ? err.message.slice(0, 300) : "query failed");
    process.exit(1);
  }

  const findings: Finding[] = [];
  let scanned = 0;

  for (const line of out.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const [kind, table, keyword, countStr] = t.split("\t");
    if (kind !== "hit") continue;
    scanned += 1;
    const count = Number(countStr);
    if (count > 0) {
      const ctx =
        table.includes("organization") || table === "customers"
          ? "organization"
          : table.includes("product") ||
              table === "categories" ||
              table === "addons" ||
              table === "case_studies"
            ? "product"
            : "platform";
      const cls = classifyKeywordHit(keyword, ctx);
      findings.push({
        area: "foreign-data",
        subject: table,
        classification: cls,
        detail: `keyword=${keyword} count=${count}`,
        blocker: cls === "FOREIGN_PROJECT_DATA" || cls === "SECURITY_BLOCKER",
      });
      console.log(`  HIT ${table} · ${keyword} · ${count} · ${cls}`);
    }
  }

  const blockers = findings.filter((f) => f.blocker);
  const reviews = findings.filter(
    (f) =>
      !f.blocker &&
      f.classification !== "APPROVED_CASE" &&
      f.classification !== "VDB_CORE",
  );
  const approved = findings.filter((f) => f.classification === "APPROVED_CASE");

  const verdict = verdictFromFindings({
    blocked: false,
    blockers: blockers.length,
    reviews: reviews.length,
  });
  console.log(`scanned table×keyword checks: ${scanned}`);
  console.log(`missing-table skips: ${skipped}`);
  console.log(`approved-case hits: ${approved.length}`);
  console.log(`blockers: ${blockers.length} reviews: ${reviews.length}`);
  console.log(verdict);

  writeEvidence(
    `supabase-isolation-foreign-data-${new Date().toISOString().slice(0, 10)}.md`,
    [
      "# Foreign data keyword scan",
      `Scanned checks: ${scanned}`,
      `Missing-table skips: ${skipped}`,
      `Approved case hits: ${approved.length}`,
      `Blockers: ${blockers.length}`,
      `Reviews: ${reviews.length}`,
      `Verdict: ${verdict}`,
      "",
      "## Hits (masked)",
      ...findings.map((f) => `- ${f.subject}: ${f.detail} (${f.classification})`),
      "",
      "No full records. Read-only: yes",
    ].join("\n"),
  );

  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
