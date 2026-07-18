import { describe, it, expect, vi, afterEach } from "vitest";
import { validateProductionEnv } from "@/config/env";

describe("Production env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(validateProductionEnv().ok).toBe(true);
  });

  it("lists missing production variables", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("MOLLIE_API_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.resetModules();
    const { validateProductionEnv: validate } = await import("@/config/env");
    const result = validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain("SUPABASE_SECRET_KEY");
    }
  });
});

describe("CSP policy", () => {
  it("does not contain script-src wildcard", async () => {
    const fs = await import("node:fs");
    const middleware = fs.readFileSync("src/middleware.ts", "utf8");
    expect(middleware).not.toMatch(/script-src\s+\*/);
    expect(middleware).not.toContain("unsafe-eval");
    expect(middleware).toContain("frame-ancestors 'none'");
    expect(middleware).toContain("form-action 'self'");
    expect(middleware).not.toMatch(/tawk\.to/i);
  });
});

describe("Product RLS policy", () => {
  it("phase3 migration excludes concept products from public read", async () => {
    const fs = await import("node:fs");
    const migration = fs.readFileSync(
      "supabase/migrations/20260714230000_phase3_product_rls_concept.sql",
      "utf8",
    );
    expect(migration).toContain("is_concept = FALSE");
    expect(migration).toContain("status = 'PUBLISHED'");
  });
});

describe("Supabase session middleware", () => {
  it("middleware refreshes sessions via updateSupabaseSession", async () => {
    const fs = await import("node:fs");
    const middleware = fs.readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain("updateSupabaseSession");
  });
});

describe("Admin permissions", () => {
  it("SUPPORT cannot assign OWNER-level product management to orders", async () => {
    const { canManageOrders, canManageProducts } = await import("@/lib/auth/permissions");
    expect(canManageOrders("SUPPORT")).toBe(true);
    expect(canManageProducts("SUPPORT")).toBe(false);
  });

  it("CONTENT cannot manage orders", async () => {
    const { canManageOrders } = await import("@/lib/auth/permissions");
    expect(canManageOrders("CONTENT")).toBe(false);
  });

  it("hasMinRole blocks SUPPORT from ADMIN actions", async () => {
    const { hasMinRole } = await import("@/lib/auth/permissions");
    expect(hasMinRole("SUPPORT", "ADMIN")).toBe(false);
    expect(hasMinRole("ADMIN", "SUPPORT")).toBe(true);
  });
});
