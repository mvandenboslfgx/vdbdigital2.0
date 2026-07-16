import { describe, it, expect } from "vitest";

describe("next.config build env validation", () => {
  it("documents preview-scoped validation message", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain('VERCEL_ENV === "preview"');
    expect(config).toContain("validatePreviewBuildEnv");
    expect(config).toContain("scope: Preview");
  });

  it("production validation only on production deploy or REQUIRE_PRODUCTION_ENV", async () => {
    const fs = await import("node:fs");
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config).toContain('vercelEnv === "production"');
    expect(config).toContain("REQUIRE_PRODUCTION_ENV");
  });
});
