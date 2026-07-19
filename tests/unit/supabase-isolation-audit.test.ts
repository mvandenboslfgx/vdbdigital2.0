import { describe, expect, it } from "vitest";
import {
  APPROVED_CASE_KEYWORDS,
  VDB_APPROVED_PROJECT_REF,
  assertNoSecretLeak,
  classifyKeywordHit,
  extractSupabaseProjectRefs,
  isApprovedProjectRef,
  isWriteSql,
  keywordContextForRepoPath,
  verdictFromFindings,
} from "../../config/supabase-project-isolation-allowlist";

describe("supabase isolation allowlist", () => {
  it("accepts only the approved project ref", () => {
    expect(isApprovedProjectRef(VDB_APPROVED_PROJECT_REF)).toBe(true);
    expect(isApprovedProjectRef("aaaaaaaaaaaaaaaaaaaa")).toBe(false);
    expect(isApprovedProjectRef(null)).toBe(false);
  });

  it("extracts supabase project refs from URLs", () => {
    const refs = extractSupabaseProjectRefs(
      `url=https://${VDB_APPROVED_PROJECT_REF}.supabase.co`,
    );
    expect(refs).toContain(VDB_APPROVED_PROJECT_REF);
  });

  it("marks foreign URLs as non-approved", () => {
    expect(isApprovedProjectRef("not-a-valid-ref")).toBe(false);
    expect(isApprovedProjectRef("zzzzzzzzzzzzzzzzzzzz")).toBe(false);
  });

  it("classifies Vermeulen as APPROVED_CASE", () => {
    expect(classifyKeywordHit("Vermeulen Bouwservice", "organization")).toBe(
      "APPROVED_CASE",
    );
    expect(APPROVED_CASE_KEYWORDS.some((k) => "vermeulenbouwservice.nl".includes(k.replace(/\s/g, ""))) ||
      classifyKeywordHit("vermeulenbouwservice.nl", "organization") === "APPROVED_CASE").toBe(true);
  });

  it("classifies Grill Gasten as APPROVED_CASE", () => {
    expect(classifyKeywordHit("Grill Gasten", "organization")).toBe(
      "APPROVED_CASE",
    );
    expect(classifyKeywordHit("grillgasten.eu", "organization")).toBe(
      "APPROVED_CASE",
    );
  });

  it("classifies TrustBooker as APPROVED_CASE for org/product only", () => {
    expect(classifyKeywordHit("trustbooker", "organization")).toBe(
      "APPROVED_CASE",
    );
    expect(classifyKeywordHit("TrustBooker portfolio", "product")).toBe(
      "APPROVED_CASE",
    );
  });

  it("never auto-approves TrustBooker/Grill as platform data", () => {
    expect(classifyKeywordHit("trustbooker", "platform")).toBe(
      "FOREIGN_PROJECT_DATA",
    );
    expect(classifyKeywordHit("trustbooker", "bucket")).toBe(
      "FOREIGN_PROJECT_DATA",
    );
    expect(classifyKeywordHit("grill gasten", "config")).toBe(
      "FOREIGN_PROJECT_DATA",
    );
  });

  it("read-only guard blocks write SQL", () => {
    expect(isWriteSql("SELECT 1")).toBe(false);
    expect(isWriteSql("INSERT INTO t VALUES (1)")).toBe(true);
    expect(isWriteSql("UPDATE t SET a=1")).toBe(true);
    expect(isWriteSql("DELETE FROM t")).toBe(true);
    expect(isWriteSql("DROP TABLE t")).toBe(true);
    expect(isWriteSql("SELECT * FROM t FOR UPDATE")).toBe(true);
  });

  it("verdict mapping is fail-closed", () => {
    expect(verdictFromFindings({ blocked: true, blockers: 0, reviews: 0 })).toBe(
      "SUPABASE ISOLATION AUDIT BLOCKED",
    );
    expect(verdictFromFindings({ blocked: false, blockers: 1, reviews: 0 })).toBe(
      "SUPABASE ISOLATION AUDIT FAIL",
    );
    expect(verdictFromFindings({ blocked: false, blockers: 0, reviews: 2 })).toBe(
      "SUPABASE ISOLATION AUDIT CONDITIONAL PASS",
    );
    expect(verdictFromFindings({ blocked: false, blockers: 0, reviews: 0 })).toBe(
      "SUPABASE ISOLATION AUDIT PASS",
    );
  });

  it("rejects secret or email leaks in reports", () => {
    expect(() => assertNoSecretLeak("service_role eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")).toThrow(
      /SECRET_LEAK/,
    );
    expect(() =>
      assertNoSecretLeak("user@example.com should not appear"),
    ).toThrow(/PII_EMAIL/);
    expect(() => assertNoSecretLeak("example.nl — 3 accounts")).not.toThrow();
  });

  it("maps portfolio paths to product context", () => {
    expect(keywordContextForRepoPath("src/components/cases/trustbooker-case-page.tsx")).toBe(
      "product",
    );
    expect(keywordContextForRepoPath("src/config/commercial/cases.ts")).toBe("product");
    expect(keywordContextForRepoPath("src/components/sections/case-preview-section.tsx")).toBe(
      "product",
    );
    expect(keywordContextForRepoPath("src/app/sitemap.ts")).toBe("product");
    expect(keywordContextForRepoPath("supabase/migrations/20260701_foo.sql")).toBe(
      "platform",
    );
    expect(keywordContextForRepoPath("src/server/repositories/products.ts")).toBe(
      "platform",
    );
  });

  it("allowlist does not auto-approve unknown buckets via keyword helper", () => {
    // Unknown org-like name without foreign keyword → review, not VDB_CORE
    expect(classifyKeywordHit("Random Merk XYZ", "organization")).toBe(
      "AMBIGUOUS_REVIEW_REQUIRED",
    );
  });
});
