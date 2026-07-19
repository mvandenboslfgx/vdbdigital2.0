/**
 * npm run audit:supabase-isolation
 * Repository + project-ref + keyword scan (read-only, no remote writes).
 */
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  VDB_APPROVED_PROJECT_REF,
  verdictFromFindings,
} from "../config/supabase-project-isolation-allowlist";
import {
  scanRepositoryProjectRefs,
  summarizeFindings,
  validateEnvProjectRef,
  writeEvidence,
} from "./lib/supabase-isolation-audit";

loadEnvLocal();

function main() {
  console.log("=== audit:supabase-isolation (read-only) ===");
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  console.log(
    `P05_MIGRATION_APPLIED: ${process.env.P05_MIGRATION_APPLIED ?? "(unset)"}`,
  );

  if (isDirectCheckoutEnabled()) {
    console.log("SUPABASE ISOLATION AUDIT FAIL");
    console.log("REASON: CHECKOUT_ENABLED must remain false");
    process.exit(1);
  }

  const env = validateEnvProjectRef();
  console.log(`env project ref: ${env.ref ?? "(none)"} — ${env.detail}`);
  if (!env.ok) {
    console.log("RESULT: FAIL — wrong or unverified Supabase project");
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    process.exit(1);
  }

  const findings = scanRepositoryProjectRefs();
  const { blockers, reviews } = summarizeFindings(findings);

  console.log(`approved ref: ${VDB_APPROVED_PROJECT_REF}`);
  console.log(`findings raw: ${findings.length}`);
  console.log(`blockers: ${blockers.length}`);
  console.log(`reviews: ${reviews.length}`);

  for (const b of blockers.slice(0, 50)) {
    console.log(`  [BLOCKER] ${b.area} · ${b.subject} · ${b.detail}`);
  }
  for (const r of reviews.slice(0, 50)) {
    console.log(`  [REVIEW] ${r.classification} · ${r.subject} · ${r.detail}`);
  }

  const verdict = verdictFromFindings({
    blocked: false,
    blockers: blockers.length,
    reviews: reviews.length,
  });
  console.log(verdict);

  const stamp = new Date().toISOString().slice(0, 10);
  writeEvidence(
    `supabase-isolation-repo-${stamp}.md`,
    [
      "# Repository isolation scan",
      "",
      `Date: ${new Date().toISOString()}`,
      `Project ref: ${VDB_APPROVED_PROJECT_REF}`,
      `CHECKOUT_ENABLED: false`,
      `P05_MIGRATION_APPLIED: unset`,
      `Verdict: ${verdict}`,
      `Blockers: ${blockers.length}`,
      `Reviews: ${reviews.length}`,
      "",
      "## Blockers",
      ...blockers.map((b) => `- ${b.subject}: ${b.detail}`),
      "",
      "## Reviews",
      ...reviews.map((r) => `- ${r.subject}: ${r.detail} (${r.classification})`),
      "",
      "Read-only: yes. No DB/Auth/Storage mutations.",
    ].join("\n"),
  );

  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
