import { describe, it, expect } from "vitest";

describe("Cloudflare build environment validation", () => {
  it("uses the explicit VDB deployment environment instead of Vercel runtime flags", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("VDB_DEPLOYMENT_ENV");
    expect(config).toContain("REQUIRE_PRODUCTION_ENV");
    expect(config).not.toContain("VERCEL_ENV");
    expect(config).not.toContain("VERCEL_URL");
  });

  it("production validation enforces the canonical APP_URL", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("assertProductionAppUrl");
    expect(config).toContain('deploymentEnv === "production"');
  });
});
