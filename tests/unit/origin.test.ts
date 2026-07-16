import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const headerStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
  }),
}));

vi.mock("@/lib/url/app-url", () => ({
  resolveAppUrl: () => "https://vdbdigital.nl",
}));

describe("verifyOrigin exact allowlist", () => {
  beforeEach(() => {
    headerStore.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts exact allowed origin", async () => {
    headerStore.set("origin", "https://vdbdigital.nl");
    const { verifyOrigin } = await import("@/lib/security/origin");
    expect(await verifyOrigin()).toBe(true);
  });

  it("rejects prefix-origin bypass attacks", async () => {
    headerStore.set("origin", "https://vdbdigital.nl.attacker.example");
    const { verifyOrigin } = await import("@/lib/security/origin");
    expect(await verifyOrigin()).toBe(false);
  });

  it("does not trust Host header for allowlisting", async () => {
    headerStore.set("origin", "https://evil.example");
    headerStore.set("host", "vdbdigital.nl");
    const { verifyOrigin } = await import("@/lib/security/origin");
    expect(await verifyOrigin()).toBe(false);
  });

  it("rejects missing Origin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const { verifyOrigin } = await import("@/lib/security/origin");
    expect(await verifyOrigin()).toBe(false);
  });
});
