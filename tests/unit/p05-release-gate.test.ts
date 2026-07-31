import { describe, it, expect } from "vitest";
import {
  validateCheckoutEnvironment,
  isPlaceholderEmailFrom,
  emailFromDomainAllowed,
} from "@/lib/checkout/env-validation";
import { evaluateCheckoutReleaseGate } from "@/lib/checkout/release-gate";
import {
  assertMollieKeySafeForRuntime,
  detectMollieKeyMode,
} from "@/lib/payments/mollie-mode";
import {
  amountMatchesOrder,
  assertHarnessUsesTestKey,
  simulateWebhookTransition,
  MOLLIE_HARNESS_STATUSES,
} from "@/lib/payments/mollie-harness";
import {
  buildRateLimitStorageKey,
  hashRateLimitIdentifier,
} from "@/lib/security/rate-limit-key";

describe("P0.5 env + Mollie mode + harness", () => {
  it("rejects placeholder EMAIL_FROM", () => {
    expect(isPlaceholderEmailFrom("onboarding@resend.dev")).toBe(true);
    expect(isPlaceholderEmailFrom("hello@vdbdigital.nl")).toBe(false);
    expect(emailFromDomainAllowed("hello@vdbdigital.nl", "vdbdigital.nl")).toBe(true);
    expect(emailFromDomainAllowed("hello@evil.com", "vdbdigital.nl")).toBe(false);
  });

  it("flags CHECKOUT_ENABLED=true as env error for P0.5", () => {
    const result = validateCheckoutEnvironment({
      CHECKOUT_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: "https://vdbdigital.nl",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "checkout_flag_on")).toBe(true);
  });

  it("separates Mollie test/live keys", () => {
    expect(detectMollieKeyMode("test_abc")).toBe("test");
    expect(detectMollieKeyMode("live_abc")).toBe("live");
    expect(
      assertMollieKeySafeForRuntime("live_abc", {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }).ok,
    ).toBe(false);
    expect(
      assertMollieKeySafeForRuntime("test_abc", {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }).ok,
    ).toBe(true);
    expect(
      assertMollieKeySafeForRuntime("live_abc", {
        APP_ENV: "staging",
        NEXT_PUBLIC_APP_URL: "https://vdb-digital-staging.vercel.app",
      }).ok,
    ).toBe(false);
    expect(
      assertMollieKeySafeForRuntime("test_abc", {
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://vdbdigital.nl",
      }).ok,
    ).toBe(false);
  });

  it("covers harness statuses and amount/currency checks", () => {
    for (const status of MOLLIE_HARNESS_STATUSES) {
      const result = simulateWebhookTransition("PENDING", status);
      expect(result.externalEventId).toContain(status);
    }
    const afterPaid = simulateWebhookTransition("PAID", "refunded");
    expect(afterPaid.apply).toBe(true);
    expect(simulateWebhookTransition("PAID", "paid").apply).toBe(false);
    expect(amountMatchesOrder("12.10", "EUR", 1210)).toBe(true);
    expect(amountMatchesOrder("12.10", "USD", 1210)).toBe(false);
    expect(amountMatchesOrder("12.00", "EUR", 1210)).toBe(false);
    expect(() => assertHarnessUsesTestKey("live_secret")).toThrow(/live/i);
  });

  it("hashes rate-limit identifiers", () => {
    const a = hashRateLimitIdentifier("Person@Example.com");
    const b = hashRateLimitIdentifier("person@example.com");
    expect(a).toBe(b);
    expect(a).not.toContain("@");
    expect(buildRateLimitStorageKey("checkout", "a@b.nl")).toMatch(/^rl:checkout:[a-f0-9]+$/);
  });

  it("release gate stays not ready without operator confirmations and keeps checkout off", () => {
    const report = evaluateCheckoutReleaseGate({
      CHECKOUT_ENABLED: "false",
      NEXT_PUBLIC_APP_URL: "https://vdbdigital.nl",
      MOLLIE_API_KEY: "test_demo",
    });
    expect(report.checkoutRemainsOff).toBe(true);
    expect(report.readyForManualEnablement).toBe(false);
    expect(report.code).not.toBe("READY FOR MANUAL CHECKOUT ENABLEMENT");
    expect(report.checks.find((c) => c.id === "feature_flag_off")?.ok).toBe(true);
  });
});
