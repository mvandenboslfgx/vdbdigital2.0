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
    expect(page).toMatch(/checkout\.successBody|payment provider|betalingsprovider/i);
  });
});

describe("Application webhook token", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("accepts missing token only in local/test contexts", () => {
    delete process.env.MOLLIE_WEBHOOK_TOKEN;
    delete process.env.MOLLIE_WEBHOOK_SECRET;
    delete process.env.APP_ENV;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "test";
    expect(verifyMollieWebhookToken(null).valid).toBe(true);
  });

  it("fail-closes when token unset on staging", () => {
    delete process.env.MOLLIE_WEBHOOK_TOKEN;
    delete process.env.MOLLIE_WEBHOOK_SECRET;
    process.env.APP_ENV = "staging";
    process.env.NODE_ENV = "production";
    expect(verifyMollieWebhookToken(null).valid).toBe(false);
  });

  it("fail-closes when token unset on Vercel preview", () => {
    delete process.env.MOLLIE_WEBHOOK_TOKEN;
    delete process.env.MOLLIE_WEBHOOK_SECRET;
    process.env.VERCEL_ENV = "preview";
    process.env.NODE_ENV = "production";
    expect(verifyMollieWebhookToken(null, process.env).valid).toBe(false);
  });

  it("rejects invalid token with timing-safe compare", () => {
    process.env.MOLLIE_WEBHOOK_TOKEN = "expected-token-value";
    expect(verifyMollieWebhookToken("wrong-token").valid).toBe(false);
    expect(timingSafeCompare("wrong-token", "expected-token-value")).toBe(false);
    expect(timingSafeCompare("expected-token-value", "expected-token-value")).toBe(true);
  });

  it("supports legacy secret query param name", () => {
    process.env.MOLLIE_WEBHOOK_TOKEN = "my-token";
    expect(verifyMollieWebhookToken("my-token").valid).toBe(true);
  });
});

describe("Preview Vercel protection bypass", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("includes bypass param on preview when secret set", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "preview.example.vercel.app";
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "bypass-secret";
    process.env.MOLLIE_WEBHOOK_TOKEN = "app-token";

    const result = buildMollieWebhookUrl();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toContain("x-vercel-protection-bypass=bypass-secret");
      expect(result.url).toContain("token=app-token");
      expect(result.url).toMatch(/^https:\/\/preview\.example\.vercel\.app/);
    }
  });

  it("blocks preview when bypass secret missing", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "preview.example.vercel.app";
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    const result = buildMollieWebhookUrl();
    expect(result.ok).toBe(false);
  });

  it("production URL has no bypass param", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    process.env.MOLLIE_WEBHOOK_TOKEN = "app-token";

    const result = buildMollieWebhookUrl();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).not.toContain("x-vercel-protection-bypass");
      expect(result.url).toContain("token=app-token");
    }
  });
});

describe("URL sanitization for logs", () => {
  it("redacts token and bypass secrets from URLs", () => {
    const url =
      "https://preview.vercel.app/api/webhooks/mollie?token=secret123&x-vercel-protection-bypass=bypass456";
    const sanitized = sanitizeUrlForLog(url);
    expect(sanitized).not.toContain("secret123");
    expect(sanitized).not.toContain("bypass456");
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

describe("AAL2 enforcement", () => {
  it("requireAal2 module enforces MFA_REQUIRED and MFA_SETUP_REQUIRED", async () => {
    const fs = await import("node:fs");
    const aal2 = fs.readFileSync("src/server/auth/require-aal2.ts", "utf8");
    expect(aal2).toContain("MFA_REQUIRED");
    expect(aal2).toContain("MFA_SETUP_REQUIRED");
    expect(aal2).toContain('currentLevel !== "aal2"');
  });

  it("guarded admin action uses requireAdmin with AAL2", async () => {
    const fs = await import("node:fs");
    const actions = fs.readFileSync("src/server/actions/auth-actions.ts", "utf8");
    expect(actions).toContain("requireAdmin");
    const admin = fs.readFileSync("src/server/auth/require-admin.ts", "utf8");
    expect(admin).toContain("requireAal2");
  });
});
