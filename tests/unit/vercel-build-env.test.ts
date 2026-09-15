import { describe, it, expect } from "vitest";

describe("next.config build env validation", () => {
  it("uses the platform-neutral deployment environment for previews", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("getDeploymentEnvironment");
    expect(config).toContain('deploymentEnv === "preview"');
    expect(config).toContain("validatePreviewBuildEnv");
    expect(config).toContain("preview deployment");
  });

  it("production validation enforces canonical APP_URL on every production host", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("assertProductionAppUrl");
    expect(config).toContain('deploymentEnv === "production"');
    expect(config).toContain("REQUIRE_PRODUCTION_ENV");
  });

  it("keeps the Vercel preview URL fallback during the migration window", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("VERCEL_URL");
    expect(config).toContain("onVercel");
  });
});
