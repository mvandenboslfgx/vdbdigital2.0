import { describe, it, expect, vi, afterEach } from "vitest";
import { allowDevFallback, isProductionRuntime } from "@/lib/runtime/environment";

describe("Development fallback guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disallows dev fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(allowDevFallback()).toBe(false);
    expect(isProductionRuntime()).toBe(true);
  });

  it("allows dev fallback in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(allowDevFallback()).toBe(true);
  });
});

describe("Supabase secret key", () => {
  it("browser client module does not reference secret key", async () => {
    const fs = await import("node:fs");
    const client = fs.readFileSync("src/lib/database/client.ts", "utf8");
    expect(client).not.toContain("SUPABASE_SECRET_KEY");
    expect(client).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    // Fragmented so this test file does not self-trigger the secret scanner
    expect(client).not.toContain(["sb", "_secret_"].join(""));
  });

  it("admin client uses server-only import", async () => {
    const fs = await import("node:fs");
    const admin = fs.readFileSync("src/lib/database/admin.ts", "utf8");
    expect(admin).toContain('import "server-only"');
    expect(admin).toContain("getSupabaseSecretKey");
  });
});
