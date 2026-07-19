/**
 * npm run audit:supabase-storage
 * Bucket inventory — no downloads.
 */
import { loadEnvLocal } from "./lib/env-loader";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  FOREIGN_PROJECT_KEYWORDS,
  isApprovedBucket,
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
  console.log("=== audit:supabase-storage (read-only) ===");
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
  const buckets = runLocalDockerSelect(`
    SELECT id, public::text,
      (SELECT count(*)::text FROM storage.objects o WHERE o.bucket_id = b.id)
    FROM storage.buckets b
    ORDER BY id
  `);
  if (!buckets.ok) {
    console.log("SUPABASE ISOLATION AUDIT BLOCKED");
    console.log(buckets.error);
    process.exit(1);
  }

  console.log(`buckets: ${buckets.rows.length}`);
  for (const [id, isPublic, objects] of buckets.rows) {
    console.log(`  ${id} public=${isPublic} objects=${objects}`);
    if (!isApprovedBucket(id)) {
      findings.push({
        area: "storage",
        subject: id,
        classification: "AMBIGUOUS_REVIEW_REQUIRED",
        detail: `unknown bucket (objects=${objects})`,
        blocker: false,
      });
    }
    for (const kw of FOREIGN_PROJECT_KEYWORDS) {
      if (id.toLowerCase().includes(kw.replace(/\s+/g, ""))) {
        const cls = classifyKeywordHit(kw, "bucket");
        findings.push({
          area: "storage",
          subject: id,
          classification: cls === "FOREIGN_PROJECT_DATA" ? "SECURITY_BLOCKER" : cls,
          detail: `bucket name matches ${kw}`,
          blocker: true,
        });
      }
    }
    const confidential = [
      "customer-documents",
      "project-files",
      "quote-documents",
      "invoice-documents",
      "support-attachments",
    ];
    if (confidential.includes(id) && (isPublic === "t" || isPublic === "true")) {
      findings.push({
        area: "storage",
        subject: id,
        classification: "SECURITY_BLOCKER",
        detail: "confidential bucket is public",
        blocker: true,
      });
    }
  }

  const blockers = findings.filter((f) => f.blocker);
  const reviews = findings.filter((f) => !f.blocker);
  const verdict = verdictFromFindings({
    blocked: false,
    blockers: blockers.length,
    reviews: reviews.length,
  });
  console.log(verdict);

  writeEvidence(
    `supabase-isolation-storage-${new Date().toISOString().slice(0, 10)}.md`,
    [
      "# Storage isolation",
      ...buckets.rows.map(
        ([id, pub, n]) => `- ${id} public=${pub} objects=${n}`,
      ),
      "",
      `Verdict: ${verdict}`,
      "No downloads. Read-only: yes",
    ].join("\n"),
  );

  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
