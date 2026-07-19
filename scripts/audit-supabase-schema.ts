/**
 * npm run audit:supabase-schema
 * Local Docker schema inventory (read-only SELECT).
 */
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  FOREIGN_PROJECT_KEYWORDS,
  classifyKeywordHit,
  verdictFromFindings,
} from "../config/supabase-project-isolation-allowlist";
import {
  runLocalDockerSelect,
  validateEnvProjectRef,
  writeEvidence,
  type Finding,
} from "./lib/supabase-isolation-audit";

loadEnvLocal();

function main() {
  console.log("=== audit:supabase-schema (read-only local) ===");
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

  const findings: Finding[] = [];
  const tables = runLocalDockerSelect(`
    SELECT n.nspname || '.' || c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','v','m')
      AND n.nspname IN ('public','storage','auth')
    ORDER BY 1
  `);
  if (!tables.ok) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log(`schema query failed: ${tables.error}`);
    process.exit(1);
  }
  console.log(`tables/views: ${tables.rows.length}`);

  const funcs = runLocalDockerSelect(`
    SELECT n.nspname || '.' || p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public')
    ORDER BY 1
  `);
  if (!funcs.ok) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log(`functions query failed: ${funcs.error}`);
    process.exit(1);
  }
  console.log(`public functions: ${funcs.rows.length}`);

  for (const [name] of [...tables.rows, ...funcs.rows]) {
    const lower = name.toLowerCase();
    for (const kw of FOREIGN_PROJECT_KEYWORDS) {
      if (lower.includes(kw.replace(/\s+/g, "_")) || lower.includes(kw.replace(/\s+/g, ""))) {
        const cls = classifyKeywordHit(kw, "platform");
        findings.push({
          area: "schema",
          subject: name,
          classification: cls,
          detail: `object name matches ${kw}`,
          blocker: cls === "FOREIGN_PROJECT_DATA" || cls === "SECURITY_BLOCKER",
        });
      }
    }
  }

  const rls = runLocalDockerSelect(`
    SELECT c.relname, c.relrowsecurity::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY 1
  `);
  if (rls.ok) {
    for (const [rel, enabled] of rls.rows) {
      if (enabled !== "t" && enabled !== "true") {
        findings.push({
          area: "rls",
          subject: rel,
          classification: "SECURITY_BLOCKER",
          detail: "RLS disabled on public table",
          blocker: true,
        });
      }
    }
  }

  const blockers = findings.filter((f) => f.blocker);
  const reviews = findings.filter((f) => !f.blocker);
  const verdict = verdictFromFindings({
    blocked: false,
    blockers: blockers.length,
    reviews: reviews.length,
  });
  console.log(`blockers: ${blockers.length} reviews: ${reviews.length}`);
  console.log(verdict);

  writeEvidence(
    `supabase-isolation-schema-${new Date().toISOString().slice(0, 10)}.md`,
    [
      "# Schema isolation (local Docker)",
      `Tables/views: ${tables.rows.length}`,
      `Functions: ${funcs.rows.length}`,
      `Verdict: ${verdict}`,
      "",
      "## Sample tables",
      ...tables.rows.slice(0, 80).map((r) => `- ${r[0]}`),
      "",
      "Read-only: yes",
    ].join("\n"),
  );

  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
