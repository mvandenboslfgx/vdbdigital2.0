import { describe, it, expect, afterEach } from "vitest";
import {
  buildMollieWebhookUrl,
  verifyMollieWebhookToken,
} from "@/lib/payments/webhook-url";
import { sanitizeUrlForLog } from "@/lib/security/sanitize-url";
import { timingSafeCompare } from "@/lib/security/timing-safe";

const env = process.env;

describe("Classic Mollie webhook route", () => {
  it("uses classic webhook without signature header verification", async () => {
    const fs = await import("node:fs");
    const route = fs.readFileSync("src/app/api/webhooks/mollie/route.ts", "utf8");
    expect(route).not.toMatch(/headers\.get\(['"]X-Mollie-Signature['"]\)/);
    expect(route).toContain("mollie.payments.get");
    expect(route).not.toContain("getMolliePaymentStatus");
  });

  it("fetches payment status from Mollie API not webhook body", async () => {
    const fs = await import("node:fs");
    const route = fs.readFileSync("src/app/api/webhooks/mollie/route.ts", "utf8");
    expect(route).toContain("payment.status");
    expect(route).toContain("getOrderById");
  });

  it("return page does not mark order paid", async () => {
    const fs = await import("node:fs");
    const page = fs.readFileSync("src/app/(shop)/checkout/success/page.tsx", "utf8");
    expect(page).not.toContain("updateOrderPaymentStatus");
  });
});

describe("Application webhook token", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("accepts when no token configured", () => {
    delete process.env.MOLLIE_WEBHOOK_TOKEN;
    delete process.env.MOLLIE_WEBHOOK_SECRET;
    expect(verifyMollieWebhookToken(null).valid).toBe(true);
  });

  it("rejects invalid token with timing-safe compare", () => {
    process.env.MOLLIE_WEBHOOK_TOKEN = "expected-token-value";
    expect(verifyMollieWebhookToken("wrong-token").valid).toBe(false);
    expect(timingSafeCompare("wrong-token", "expected-token-value")).toBe(false);
    expect(timingSafeCompare("expected-token-value", "expected-token-value")).toBe(true);
  });
});

describe("Cloudflare webhook URL", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("builds a preview webhook without provider-specific bypass parameters", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "preview";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-vdb.workers.dev";
    process.env.MOLLIE_WEBHOOK_TOKEN = "app-token";

    const result = buildMollieWebhookUrl();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe(
        "https://preview-vdb.workers.dev/api/webhooks/mollie?token=app-token",
      );
      expect(result.url).not.toContain("vercel");
    }
  });

  it("builds production webhook on the canonical apex", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    process.env.MOLLIE_WEBHOOK_TOKEN = "app-token";

    const result = buildMollieWebhookUrl();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe(
        "https://vdbdigital.nl/api/webhooks/mollie?token=app-token",
      );
    }
  });
});

describe("URL sanitization for logs", () => {
  it("redacts token values from URLs", () => {
    const url =
      "https://preview-vdb.workers.dev/api/webhooks/mollie?token=secret123";
    const sanitized = sanitizeUrlForLog(url);
    expect(sanitized).not.toContain("secret123");
    expect(decodeURIComponent(sanitized)).toContain("[REDACTED]");
  });
});

describe("Webhook idempotency", () => {
  it("order service handles duplicate webhook_events", async () => {
    const fs = await import("node:fs");
    const service = fs.readFileSync("src/server/services/order-service.ts", "utf8");
    expect(service).toContain("23505");
    expect(service).toContain("alreadyProcessed");
  });
});
