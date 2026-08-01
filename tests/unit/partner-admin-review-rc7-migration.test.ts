/**
 * Static SQL contract checks for staff_attest_partner_admin_review (no DB apply).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = resolve(
  "supabase/migrations/20260801120000_staff_attest_partner_admin_review_rc7.sql",
);
const CHECKLIST = resolve(
  "supabase/migrations/20260729140100_partner_identity_directory_rc5_activation.sql",
);

describe("staff_attest_partner_admin_review migration (static)", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const checklist = readFileSync(CHECKLIST, "utf8");

  it("requires staff + AAL2 + rate limit and allowlisted outcomes/reasons", () => {
    expect(sql).toMatch(/is_staff_admin\(\)/);
    expect(sql).toMatch(/require_aal2\(\)/);
    expect(sql).toMatch(/check_rate_limit/);
    expect(sql).toMatch(/PROFILE_DATA_REVIEWED/);
    expect(sql).toMatch(/ADMINISTRATIVE_REVIEW_REJECTED/);
    expect(sql).toMatch(/'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'NOT_STARTED'/);
  });

  it("never writes provider_ref from parameters and never activates", () => {
    expect(sql).not.toMatch(/identity_verification_provider_ref\s*=\s*p_/);
    expect(sql).not.toMatch(/status\s*=\s*'ACTIVE'/);
    expect(sql).not.toMatch(/payout_eligible\s*=\s*true/);
    expect(sql).toMatch(/provider_ref_touched',\s*false/);
  });

  it("audits only on change and documents administrative semantics", () => {
    expect(sql).toMatch(/admin\.partner\.admin_review\.attested/);
    expect(sql).toMatch(/administrative_partner_review_v1/);
    expect(sql).toMatch(/IF v_prev = v_outcome THEN/);
    // Executable body must not wire providers; header comments may negate them.
    const body = sql.slice(sql.indexOf("AS $$"), sql.lastIndexOf("$$;"));
    expect(body).not.toMatch(/Veriff|Sumsub|Onfido/i);
    expect(body).not.toMatch(/getUserMedia|identity_document_upload/i);
  });

  it("does not alter AGE or other checklist gate SQL in the activation migration", () => {
    expect(checklist).toMatch(/AGE_NOT_VERIFIED/);
    expect(checklist).toMatch(/IDENTITY_NOT_VERIFIED/);
    expect(checklist).toMatch(/BUSINESS_NOT_VERIFIED/);
    expect(checklist).toMatch(/AGREEMENT_NOT_ACCEPTED/);
    expect(checklist).toMatch(/PAYOUT_PROFILE_NOT_APPROVED/);
    expect(checklist).toMatch(/STAFF_APPROVAL_MISSING/);
    // Fase 2 migration must not CREATE OR REPLACE partner_activation_checklist
    expect(sql).not.toMatch(
      /CREATE OR REPLACE FUNCTION public\.partner_activation_checklist/,
    );
  });
});
