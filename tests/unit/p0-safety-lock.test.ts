import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Tawk identity hash route safety", () => {
  it("no longer signs arbitrary public emails", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/tawk/hash/route.ts"),
      "utf8",
    );
    expect(source).not.toContain("generateTawkVisitorHash");
    expect(source).toContain("404");
    expect(source).not.toMatch(/email:\s*z\.string\(\)\.email/);
  });
});

describe("Checkout feature flag default", () => {
  it("defaults CHECKOUT_ENABLED to off in feature config", async () => {
    const { isDirectCheckoutEnabled } = await import("@/config/features");
    expect(isDirectCheckoutEnabled()).toBe(false);
  });
});
