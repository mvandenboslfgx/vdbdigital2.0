import { describe, it, expect, vi, afterEach } from "vitest";

describe("tawk.to optional configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is disabled without widget ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_TAWK_PROPERTY_ID", "property123");
    vi.stubEnv("NEXT_PUBLIC_TAWK_WIDGET_ID", "");
    const { isTawkEmbedConfigured, getTawkEmbedUrl } = await import("@/config/tawk");
    expect(isTawkEmbedConfigured()).toBe(false);
    expect(getTawkEmbedUrl()).toBeNull();
  });

  it("is enabled with property and widget ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_TAWK_PROPERTY_ID", "property123");
    vi.stubEnv("NEXT_PUBLIC_TAWK_WIDGET_ID", "widget456");
    const { isTawkEmbedConfigured, getTawkEmbedUrl } = await import("@/config/tawk");
    expect(isTawkEmbedConfigured()).toBe(true);
    expect(getTawkEmbedUrl()).toBe("https://embed.tawk.to/property123/widget456");
  });
});

describe("WhatsApp fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds wa.me link when number configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+31612345678");
    const { buildWhatsAppUrl } = await import("@/components/chat/whatsapp-button");
    const url = buildWhatsAppUrl("Test");
    expect(url).toContain("wa.me/31612345678");
  });
});

describe("Preview env validation script", () => {
  it("does not require Upstash or tawk widget", async () => {
    const fs = await import("node:fs");
    const preview = fs.readFileSync("scripts/validate-env-preview.ts", "utf8");
    const groups = fs.readFileSync("scripts/lib/validate-env-groups.ts", "utf8");
    expect(preview).not.toContain("UPSTASH");
    expect(preview).not.toContain("optional/chat");
    expect(groups).not.toContain("production/rate-limit");
  });
});

describe("WAF documentation", () => {
  it("lists sensitive public routes and HTTP inventory", async () => {
    const fs = await import("node:fs");
    const waf = fs.readFileSync("docs/VERCEL_WAF_RATE_LIMITING.md", "utf8");
    const http = fs.readFileSync("docs/HTTP_MUTATION_ROUTES.md", "utf8");
    expect(waf).toContain("/contact");
    expect(waf).toContain("public-mutations-combined");
    expect(http).toContain("/api/webhooks/mollie");
    expect(waf).not.toMatch(/15 min/i);
  });
});
