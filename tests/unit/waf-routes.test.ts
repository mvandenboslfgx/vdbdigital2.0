import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALL_DOCUMENTED_MUTATION_ROUTES,
  API_MUTATION_ROUTES,
  FORM_MUTATION_ROUTES,
  MAX_WAF_WINDOW_MINUTES,
  WAF_EXCLUDED_PATHS,
  WAF_PUBLIC_MUTATION_PATHS,
} from "@/config/waf-routes";
import {
  isWafExcludedPath,
  WAF_PROTECTED_ROUTES,
} from "@/lib/security/rate-limit";

const ROOT = process.cwd();

function fileExists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath));
}

describe("HTTP mutation route inventory", () => {
  it("documents form server actions on real page paths", () => {
    expect(FORM_MUTATION_ROUTES.map((r) => r.path)).toEqual([
      "/contact",
      "/quote",
      "/support",
      "/checkout",
    ]);
    expect(fileExists("src/app/(marketing)/contact/page.tsx")).toBe(true);
    expect(fileExists("src/app/(marketing)/quote/page.tsx")).toBe(true);
    expect(fileExists("src/app/(marketing)/support/page.tsx")).toBe(true);
    expect(fileExists("src/app/(shop)/checkout/page.tsx")).toBe(true);
  });

  it("documents API route handlers that exist", () => {
    for (const route of API_MUTATION_ROUTES) {
      if (route.path === "/api/webhooks/mollie") {
        expect(fileExists("src/app/api/webhooks/mollie/route.ts")).toBe(true);
      }
      if (route.path === "/api/tawk/hash") {
        expect(fileExists("src/app/api/tawk/hash/route.ts")).toBe(true);
      }
    }
  });

  it("does not claim admin login POST exists", () => {
    const adminLogin = ALL_DOCUMENTED_MUTATION_ROUTES.find((r) =>
      r.path.includes("/admin/login"),
    );
    expect(adminLogin).toBeUndefined();
  });
});

describe("Mollie webhook WAF exclusion", () => {
  it("excludes webhook from public mutation paths", () => {
    expect(WAF_EXCLUDED_PATHS).toContain("/api/webhooks/mollie");
    expect(WAF_PUBLIC_MUTATION_PATHS).not.toContain("/api/webhooks/mollie");
    expect(isWafExcludedPath("/api/webhooks/mollie")).toBe(true);
  });

  it("WAF protected routes do not include webhook", () => {
    const paths = WAF_PROTECTED_ROUTES.map((r) => r.path);
    expect(paths.some((p) => p.includes("webhooks/mollie"))).toBe(false);
  });
});

describe("WAF plan constraints in documentation", () => {
  it("uses max 10 minute windows only", () => {
    expect(MAX_WAF_WINDOW_MINUTES).toBeLessThanOrEqual(10);
    const doc = readFileSync("docs/VERCEL_WAF_RATE_LIMITING.md", "utf8");
    expect(doc).not.toMatch(/15 min/i);
    expect(doc).toMatch(/10 min/i);
  });

  it("Hobby uses single combined rate limit rule", () => {
    const doc = readFileSync("docs/VERCEL_WAF_RATE_LIMITING.md", "utf8");
    expect(doc).toContain("public-mutations-combined");
    expect(doc).toMatch(/Hobby[\s\S]*?1/);
  });

  it("does not block Mollie webhook in combined rule", () => {
    const doc = readFileSync("docs/VERCEL_WAF_RATE_LIMITING.md", "utf8");
    expect(doc).toContain("Path is NOT /api/webhooks/mollie");
    expect(doc).toMatch(/Log only/i);
  });
});

describe("Application security without Upstash", () => {
  it("form actions still use origin guard and validation", async () => {
    const source = readFileSync("src/server/actions/form-actions.ts", "utf8");
    expect(source).toContain("verifyOrigin");
    expect(source).toContain("checkRateLimit");
    expect(source).toContain("contactFormSchema");
    expect(source).toContain("website");
  });

  it("checkout uses honeypot and Mollie server-side", async () => {
    const source = readFileSync("src/server/actions/checkout-actions.ts", "utf8");
    expect(source).toContain("raw.website");
    expect(source).toContain("createMolliePayment");
    expect(source).toContain("verifyOrigin");
  });
});

describe("Webhook idempotency", () => {
  it("order service handles duplicate webhook", async () => {
    const source = readFileSync("src/server/services/order-service.ts", "utf8");
    expect(source).toContain("alreadyProcessed");
    expect(source).toContain("webhook_events");
  });
});
