import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  BEHAVIORAL_CONTRACT_CHECKS,
  evaluateContractResults,
  formatEvidenceBlock,
  P0_PAYMENT_MIGRATION_FILES,
  REQUIRED_CONTRACT_CHECKS,
  type VerifyCheck,
} from "../../scripts/lib/p0-payment-contracts";

describe("P0 payment contract verifier catalog", () => {
  it("lists all three migration files and they exist in the repo", () => {
    expect(P0_PAYMENT_MIGRATION_FILES).toHaveLength(3);
    for (const file of P0_PAYMENT_MIGRATION_FILES) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(true);
    }
  });

  it("requires SECURITY DEFINER, search_path, permissions, enums, and RLS checks", () => {
    const required = new Set(REQUIRED_CONTRACT_CHECKS);
    expect(required.has("enum:payment_status_extended")).toBe(true);
    expect(required.has("rpc:check_rate_limit.security_definer")).toBe(true);
    expect(required.has("rpc:check_rate_limit.search_path")).toBe(true);
    expect(required.has("rpc:check_rate_limit.no_public_execute")).toBe(true);
    expect(required.has("rpc:check_rate_limit.advisory_lock")).toBe(true);
    expect(required.has("rpc:apply_mollie_payment_update.signature")).toBe(true);
    expect(required.has("rls:rate_limit_buckets.deny_authenticated")).toBe(true);
    expect(required.has("index:idx_orders_idempotency_key")).toBe(true);
  });

  it("requires behavioral reclaim/refund checks for full gate", () => {
    expect(BEHAVIORAL_CONTRACT_CHECKS).toContain("behavioral:webhook_reclaim_after_failed");
    expect(BEHAVIORAL_CONTRACT_CHECKS).toContain("behavioral:refund_after_paid");
    expect(BEHAVIORAL_CONTRACT_CHECKS).toContain("behavioral:rate_limit_serial_cap");
  });

  it("fails closed when required checks are missing from RPC output", () => {
    const rows: VerifyCheck[] = [
      { name: "table:orders", ok: true },
      { name: "behavioral:skipped", ok: true, detail: "skipped" },
    ];
    const summary = evaluateContractResults(rows, { requireBehavioral: false });
    expect(summary.ok).toBe(false);
    expect(summary.missingRequired.length).toBeGreaterThan(10);
  });

  it("fails closed when behavioral is required but skipped", () => {
    const rows: VerifyCheck[] = REQUIRED_CONTRACT_CHECKS.map((name) => ({
      name,
      ok: true,
    }));
    rows.push({ name: "behavioral:skipped", ok: true, detail: "skipped" });
    const summary = evaluateContractResults(rows, { requireBehavioral: true });
    expect(summary.ok).toBe(false);
    expect(summary.failed.some((f) => f.name === "behavioral:required")).toBe(true);
  });

  it("passes only when every required contract is present and ok", () => {
    const rows: VerifyCheck[] = [
      ...REQUIRED_CONTRACT_CHECKS.map((name) => ({ name, ok: true })),
      ...BEHAVIORAL_CONTRACT_CHECKS.map((name) => ({ name, ok: true })),
    ];
    const summary = evaluateContractResults(rows, { requireBehavioral: true });
    expect(summary.ok).toBe(true);
    expect(summary.failed).toHaveLength(0);
  });

  it("formats evidence without embedding secrets", () => {
    const summary = evaluateContractResults(
      REQUIRED_CONTRACT_CHECKS.map((name) => ({ name, ok: true })),
      { requireBehavioral: false },
    );
    const md = formatEvidenceBlock(summary, {
      environment: "staging",
      runAt: "2026-07-16T00:00:00.000Z",
      behavioral: false,
    });
    expect(md).toContain("Result: PASS");
    expect(md).toContain("Do **not** set `P05_MIGRATION_APPLIED=1`");
    expect(md).not.toMatch(/eyJ/);
    expect(md).not.toMatch(/sk_live_|re_[A-Za-z0-9]{10,}/);
  });

  it("SQL verifier migration defines contract RPC with restricted execute", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260716020000_p05_verify_payment_contracts.sql"),
      "utf8",
    );
    expect(sql).toContain("p05_verify_payment_contracts");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION p05_verify_payment_contracts(BOOLEAN) TO service_role");
    expect(sql).toContain("REVOKE ALL ON FUNCTION p05_verify_payment_contracts(BOOLEAN) FROM PUBLIC");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("behavioral:webhook_reclaim_after_failed");
    expect(sql).toContain("AUTHORIZED");
    expect(sql).toContain("CHARGED_BACK");
  });
});
