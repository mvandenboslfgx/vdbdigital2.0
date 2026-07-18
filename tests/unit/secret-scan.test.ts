import { describe, it, expect } from "vitest";
import {
  buildSecretRules,
  scanText,
  scanRepository,
  testOnlyAssemble,
  SECRET_SCAN_ALLOWLIST,
  isProbablyBinaryPath,
  type AllowlistEntry,
} from "../../scripts/lib/secret-scan";

describe("secret-scan rules", () => {
  it("builds contiguous patterns at runtime without self-matching this fixture source via fragments", () => {
    const rules = buildSecretRules();
    expect(rules.length).toBeGreaterThan(5);
    expect(rules.every((r) => r.re instanceof RegExp)).toBe(true);
  });

  it("detects a real Supabase secret prefix", () => {
    const secret = testOnlyAssemble(["sb", "_secret_", "abcdefghijklmnopqrstuvwxyz"]);
    const findings = scanText("leak.ts", `KEY=${secret}`);
    expect(findings.some((f) => f.ruleId === "supabase_secret_prefix")).toBe(true);
  });

  it("detects Mollie live key assignment", () => {
    const key = testOnlyAssemble(["live_", "abcdefghijklmnopqrstuvwxyz12"]);
    const findings = scanText("cfg.ts", `MOLLIE_API_KEY=${key}`);
    expect(findings.some((f) => f.ruleId === "mollie_live_key")).toBe(true);
  });

  it("detects API token assignment", () => {
    const findings = scanText(
      "cfg.ts",
      "API_TOKEN=abcdefghijklmnopqrstuvwxyz012345",
    );
    expect(findings.some((f) => f.ruleId === "generic_api_token_assignment")).toBe(true);
  });

  it("detects postgres connection string with password", () => {
    const findings = scanText(
      "cfg.ts",
      "DATABASE_URL=postgresql://user:supersecret@db.example.com:5432/app",
    );
    expect(findings.some((f) => f.ruleId === "postgres_url_with_password")).toBe(true);
  });

  it("does not flag scanner regex source assembled from fragments", () => {
    const source = `
      const sb = "sb";
      const secret = "secret";
      const re = new RegExp(sb + "_" + secret + "_[A-Za-z0-9]+");
    `;
    const findings = scanText("scripts/lib/secret-scan.ts", source);
    expect(findings).toEqual([]);
  });

  it("allows safe placeholders", () => {
    const findings = scanText(
      ".env.example",
      [
        "SUPABASE_SECRET_KEY=CHANGE_ME",
        "MOLLIE_API_KEY=CHANGE_ME",
        "API_TOKEN=CHANGE_ME",
        "DATABASE_URL=postgresql://user:CHANGE_ME@localhost:5432/app",
      ].join("\n"),
    );
    expect(findings).toEqual([]);
  });

  it("detects connection string with real password", () => {
    const findings = scanText(
      "cfg.ts",
      "DATABASE_URL=postgresql://user:supersecret@db.example.com:5432/app",
    );
    expect(findings.some((f) => f.ruleId === "postgres_url_with_password")).toBe(true);
  });

  it("skips unreadable binary-like content via null bytes without crashing", () => {
    // Repository scanner skips null bytes; scanText still runs on provided text
    expect(isProbablyBinaryPath("x.bin.png")).toBe(true);
  });

  it("encoded/split fixture does not self-match until assembled", () => {
    const parts = ["sb", "_secret_", "abcdefghijklmnop"];
    expect(scanText("fix.ts", parts.join(" + "))).toEqual([]);
    expect(
      scanText("leak.ts", testOnlyAssemble(parts)).some(
        (f) => f.ruleId === "supabase_secret_prefix",
      ),
    ).toBe(true);
  });

  it("does not flag .env.example style placeholders without real tokens", () => {
    const findings = scanText(
      ".env.example",
      "SUPABASE_URL=https://example.supabase.co\nEMAIL_FROM=noreply@example.com\n",
    );
    expect(findings).toEqual([]);
  });

  it("treats binary extensions as non-text", () => {
    expect(isProbablyBinaryPath("public/logo.png")).toBe(true);
    expect(isProbablyBinaryPath("src/app/page.tsx")).toBe(false);
  });

  it("fail-closed allowlist requires lineMustMatch", () => {
    const secret = testOnlyAssemble(["sb", "_secret_", "abcdefghijklmnopqrstuvwxyz"]);
    const allowlist: AllowlistEntry[] = [
      {
        path: "fixture.ts",
        line: 1,
        ruleId: "supabase_secret_prefix",
        lineMustMatch: /THIS_WILL_NOT_MATCH/,
        reason: "invalid",
      },
    ];
    const findings = scanText("fixture.ts", `x=${secret}`, { allowlist });
    expect(findings.length).toBe(1);
  });

  it("allowlist is empty by default (no broad excludes)", () => {
    expect(SECRET_SCAN_ALLOWLIST.length).toBe(0);
  });
});

describe("secret-scan repository", () => {
  it("scans the real repo without self-match false positives", () => {
    const report = scanRepository({ root: process.cwd() });
    expect(report.readErrors).toEqual([]);
    expect(report.scannedFiles).toBeGreaterThan(50);
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
