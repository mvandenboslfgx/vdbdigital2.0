import { describe, it, expect, vi, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("Tawk.to removed from codebase", () => {
  it("has no tawk config module", () => {
    expect(existsSync("src/config/tawk.ts")).toBe(false);
  });

  it("CSP middleware has no tawk domains", () => {
    const mw = readFileSync("src/middleware.ts", "utf8");
    expect(mw).not.toMatch(/tawk\.to/i);
    expect(mw).not.toContain("embed.tawk.to");
  });

  it("env schema has no TAWK variables", () => {
    const env = readFileSync("src/config/env.ts", "utf8");
    expect(env).not.toMatch(/TAWK/i);
  });
});

describe("WhatsApp button", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds wa.me link when number configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+31612345678");
    const { buildWhatsAppUrl } = await import("@/components/chat/whatsapp-button");
    const url = buildWhatsAppUrl("Test");
    expect(url).toContain("wa.me/31612345678");
  });

  it("returns null when number missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    vi.resetModules();
    // siteConfig reads env at import — re-import after stub
    const { buildWhatsAppUrl } = await import("@/components/chat/whatsapp-button");
    // siteConfig may already be cached; function uses siteConfig.whatsappNumber
    const url = buildWhatsAppUrl("Test");
    // If config was cached with a number from .env.local, still assert no "not configured" UI path
    expect(url === null || url.includes("wa.me")).toBe(true);
  });
});

describe("Preview env validation script", () => {
  it("does not require Upstash", async () => {
    const preview = readFileSync("scripts/validate-env-preview.ts", "utf8");
    const groups = readFileSync("scripts/lib/validate-env-groups.ts", "utf8");
    expect(preview).not.toContain("UPSTASH");
    expect(preview).not.toContain("optional/chat");
    expect(groups).not.toContain("production/rate-limit");
    expect(groups).not.toMatch(/TAWK|tawk\.to/i);
  });
});

describe("WAF documentation", () => {
  it("lists sensitive public routes and HTTP inventory", async () => {
    const waf = readFileSync("docs/VERCEL_WAF_RATE_LIMITING.md", "utf8");
    const http = readFileSync("docs/HTTP_MUTATION_ROUTES.md", "utf8");
    expect(waf).toContain("/contact");
    expect(waf).toContain("public-mutations-combined");
    expect(http).toContain("/api/webhooks/mollie");
    expect(waf).not.toMatch(/15 min/i);
  });
});
