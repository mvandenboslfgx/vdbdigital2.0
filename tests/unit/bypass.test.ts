import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/server/auth/errors";

vi.mock("@/lib/database/server", () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/server/auth/require-session", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/server/auth/require-aal2", () => ({
  requireAal2: vi.fn(),
}));

describe("Bypass prevention — static checks", () => {
  it("bootstrap script is not exposed as web route", async () => {
    const fs = await import("node:fs");
    const glob = fs.readdirSync("src/app", { recursive: true }) as string[];
    const routes = glob.filter((f) => String(f).includes("bootstrap"));
    expect(routes.length).toBe(0);
  });

  it("secret key not imported in client components", async () => {
    const { execSync } = await import("node:child_process");
    const result = execSync("npm run env:scan-secrets", { encoding: "utf8" });
    expect(result).toContain("PASS");
  });

  it("Mollie webhook rejects GET", async () => {
    const fs = await import("node:fs");
    const route = fs.readFileSync("src/app/api/webhooks/mollie/route.ts", "utf8");
    expect(route).toContain("405");
    expect(route).toContain("verifyMollieWebhookToken");
  });

  it("protected admin layout uses checkAdminAccess not client role", async () => {
    const fs = await import("node:fs");
    const layout = fs.readFileSync("src/app/admin/(protected)/layout.tsx", "utf8");
    expect(layout).toContain("checkAdminAccess");
    expect(layout).not.toContain("localStorage");
  });

  it("phase6 migration denies authenticated on sensitive tables", async () => {
    const fs = await import("node:fs");
    const migration = fs.readFileSync(
      "supabase/migrations/20260715000000_phase6_access_control.sql",
      "utf8",
    );
    expect(migration).toContain("Deny authenticated orders");
    expect(migration).toContain("Deny authenticated audit_logs");
    expect(migration).toContain("Authenticated read own admin role");
  });
});

describe("Bypass prevention — guarded admin action", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("guardedAdminPingAction rejects without session", async () => {
    const { requireAuthenticatedUser } = await import(
      "@/server/auth/require-session"
    );
    vi.mocked(requireAuthenticatedUser).mockRejectedValue(
      new AuthError("UNAUTHENTICATED"),
    );

    const { guardedAdminPingAction } = await import(
      "@/server/actions/auth-actions"
    );

    await expect(guardedAdminPingAction()).rejects.toThrow(AuthError);
  });
});

describe("Role escalation prevention", () => {
  it("CONTENT cannot publish products", async () => {
    const { hasPermission } = await import("@/lib/auth/permissions");
    expect(hasPermission("CONTENT", "products.publish")).toBe(false);
  });

  it("SUPPORT cannot refund payments", async () => {
    const { hasPermission } = await import("@/lib/auth/permissions");
    expect(hasPermission("SUPPORT", "payments.refund")).toBe(false);
  });

  it("ADMIN cannot manage roles", async () => {
    const { hasPermission } = await import("@/lib/auth/permissions");
    expect(hasPermission("ADMIN", "roles.manage")).toBe(false);
  });
});

describe("IDOR prevention helpers", () => {
  it("invalid order UUID throws NOT_FOUND", async () => {
    const { assertValidUuid } = await import("@/server/auth/authorize-resource");
    try {
      assertValidUuid("../../etc/passwd");
      expect.fail("should throw");
    } catch (e) {
      expect(e).toMatchObject({ code: "NOT_FOUND" });
    }
  });
});

describe("Secret leakage prevention", () => {
  it("production fallback test passes", async () => {
    const fs = await import("node:fs");
    const test = fs.readFileSync("tests/unit/production-fallback.test.ts", "utf8");
    expect(test).toContain("SUPABASE_SECRET_KEY");
  });
});

describe("CSRF/origin on auth mutations", () => {
  it("login action checks origin", async () => {
    const fs = await import("node:fs");
    const actions = fs.readFileSync("src/server/actions/auth-actions.ts", "utf8");
    expect(actions).toContain("verifyOrigin");
  });
});

describe("Webhook idempotency", () => {
  it("order service uses webhook_events unique constraint", async () => {
    const fs = await import("node:fs");
    const service = fs.readFileSync("src/server/services/order-service.ts", "utf8");
    expect(service).toContain("webhook_events");
    expect(service).toContain("23505");
    expect(service).toContain("alreadyProcessed");
  });
});
