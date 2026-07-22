import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("partner backend hygiene", () => {
  it("keeps partner migrations outside exact-17 production baseline", () => {
    const files = [
      "20260722100000_partner_identity_roles.sql",
      "20260722110000_partner_applications_profiles_codes.sql",
      "20260722120000_partner_leads_and_sales.sql",
      "20260722130000_partner_commissions_and_ledger.sql",
      "20260722140000_partner_payouts.sql",
      "20260722150000_partner_cash_receipts_adjustments.sql",
      "20260722160000_partner_rls_and_rpcs.sql",
      "20260722170000_partner_verify_contracts.sql",
    ];
    for (const f of files) {
      const p = resolve("supabase/migrations", f);
      expect(existsSync(p)).toBe(true);
      const sql = readFileSync(p, "utf8");
      expect(sql).toMatch(/Outside production apply baseline|outside production apply baseline/i);
      expect(sql).not.toMatch(/nhsrdnjfsxfikfbdmdfj/);
    }
  });

  it("does not overload marketing leads for partner attribution", () => {
    const sql = readFileSync(
      resolve("supabase/migrations/20260722120000_partner_leads_and_sales.sql"),
      "utf8",
    );
    expect(sql).toContain("partner_leads");
    expect(sql).toMatch(/NOT marketing/i);
  });

  it("documents deferred storage and reviews", () => {
    const gap = readFileSync(resolve("docs/staging-backend-gap-register.md"), "utf8");
    expect(gap).toContain("DEFERRED_NON_BLOCKING");
    expect(gap).toContain("BCP-STAGING-009");
    expect(gap).toContain("BCP-STAGING-011");
  });
});
