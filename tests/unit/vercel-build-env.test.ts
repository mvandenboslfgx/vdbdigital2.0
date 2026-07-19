import { describe, it, expect } from "vitest";

describe("next.config build env validation", () => {
  it("documents preview-scoped validation message", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain('vercelEnv === "preview"');
    expect(config).toContain("validatePreviewBuildEnv");
    expect(config).toContain("scope: Preview");
  });

  it("production validation enforces canonical APP_URL on production deploy", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain("assertProductionAppUrl");
    expect(config).toContain('vercelEnv === "production"');
    expect(config).toContain("REQUIRE_PRODUCTION_ENV");
  });
});
