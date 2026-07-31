import { describe, expect, it } from "vitest";
import {
  assertStagingMollieE2EGuards,
  buildStagingMollieWebhookUrl,
  detectMollieShape,
  redactPaymentId,
  STAGING_SUPABASE_REF,
} from "../../scripts/lib/staging-mollie-guards";

describe("staging Mollie E2E guards", () => {
  const base = {
    allowFlag: "true",
    mollieApiKey: "test_abcdefghijklmnopqrstuvwxyz",
    checkoutEnabled: undefined,
    stagingAppUrl:
      "https://vdb-digital-staging-r9qi6l84p-matthijs-projects-301cd812.vercel.app",
    supabaseUrl: `https://${STAGING_SUPABASE_REF}.supabase.co`,
    supabaseRef: STAGING_SUPABASE_REF,
  };

  it("passes with test key and staging targets", () => {
    expect(assertStagingMollieE2EGuards(base).ok).toBe(true);
  });

  it("refuses without allow flag", () => {
    const r = assertStagingMollieE2EGuards({ ...base, allowFlag: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ALLOW_FLAG");
  });

  it("stops on live Mollie key", () => {
    const r = assertStagingMollieE2EGuards({
      ...base,
      mollieApiKey: "live_should_never_run",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("LIVE_MOLLIE");
      expect(r.message).toContain("LIVE MOLLIE");
    }
  });

  it("refuses checkout enabled", () => {
    const r = assertStagingMollieE2EGuards({
      ...base,
      checkoutEnabled: "true",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CHECKOUT_ENABLED");
  });

  it("hard-denies production supabase ref", () => {
    const r = assertStagingMollieE2EGuards({
      ...base,
      supabaseRef: "nhsrdnjfsxfikfbdmdfj",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PROD_REF");
  });

  it("refuses production hosts", () => {
    const r = assertStagingMollieE2EGuards({
      ...base,
      stagingAppUrl: "https://vdbdigital.nl",
    });
    expect(r.ok).toBe(false);
  });

  it("builds webhook URL without vercel bypass param", () => {
    const url = buildStagingMollieWebhookUrl(
      "https://vdb-digital-staging-example.vercel.app",
      "tok",
    );
    expect(url).toContain("/api/webhooks/mollie?");
    expect(url).toContain("token=");
    expect(url).not.toContain("x-vercel-protection-bypass");
  });

  it("detects key shapes and redacts payment ids", () => {
    expect(detectMollieShape("test_abc")).toBe("test");
    expect(detectMollieShape("live_abc")).toBe("live");
    expect(detectMollieShape("")).toBe("missing");
    expect(redactPaymentId("tr_abcdefghijklmnop")).toBe("tr_abcde…");
  });
});
