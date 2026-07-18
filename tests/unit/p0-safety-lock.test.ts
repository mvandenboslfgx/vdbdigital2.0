import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

describe("Tawk.to removal", () => {
  it("does not ship a tawk hash API route", () => {
    expect(existsSync(join(process.cwd(), "src/app/api/tawk/hash/route.ts"))).toBe(
      false,
    );
  });

  it("does not ship tawk config or secure hash helpers", () => {
    expect(existsSync(join(process.cwd(), "src/config/tawk.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/chat/tawk-secure.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/components/chat/chat-provider.tsx"))).toBe(
      false,
    );
  });
});

describe("Checkout feature flag default", () => {
  it("defaults CHECKOUT_ENABLED to off in feature config", async () => {
    const { isDirectCheckoutEnabled } = await import("@/config/features");
    expect(isDirectCheckoutEnabled()).toBe(false);
  });
});
