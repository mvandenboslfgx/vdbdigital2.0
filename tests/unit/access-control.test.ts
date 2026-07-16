import { describe, it, expect } from "vitest";
import { AuthError, authErrorToStatus } from "@/server/auth/errors";
import {
  rejectForbiddenFields,
  assertValidUuid,
  FORBIDDEN_CLIENT_FIELDS,
} from "@/server/auth/authorize-resource";

describe("Central authorization layer", () => {
  it("exports server-only auth modules", async () => {
    const fs = await import("node:fs");
    const files = [
      "src/server/auth/require-session.ts",
      "src/server/auth/require-admin.ts",
      "src/server/auth/require-permission.ts",
      "src/server/auth/require-aal2.ts",
      "src/server/auth/authorize-resource.ts",
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).toContain('import "server-only"');
    }
  });

  it("auth actions use server-only guard", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync("src/server/actions/auth-actions.ts", "utf8");
    expect(content).toContain('"use server"');
    expect(content).toContain("verifyOrigin");
    expect(content).toContain("writeAuditLog");
  });
});

describe("AuthError status mapping", () => {
  it("maps UNAUTHENTICATED to 401", () => {
    expect(authErrorToStatus("UNAUTHENTICATED")).toBe(401);
    expect(authErrorToStatus("MFA_REQUIRED")).toBe(401);
  });

  it("maps FORBIDDEN to 403", () => {
    expect(authErrorToStatus("FORBIDDEN")).toBe(403);
  });

  it("maps NOT_FOUND to 404", () => {
    expect(authErrorToStatus("NOT_FOUND")).toBe(404);
  });
});

describe("Mass assignment prevention", () => {
  it("rejects forbidden client fields", () => {
    expect(() =>
      rejectForbiddenFields({ name: "test", role: "OWNER" }),
    ).toThrow(AuthError);
  });

  it("allows safe fields", () => {
    expect(() => rejectForbiddenFields({ name: "test" })).not.toThrow();
  });

  it("lists critical forbidden fields", () => {
    expect(FORBIDDEN_CLIENT_FIELDS).toContain("role");
    expect(FORBIDDEN_CLIENT_FIELDS).toContain("price_cents");
    expect(FORBIDDEN_CLIENT_FIELDS).toContain("payment_status");
  });
});

describe("Object ID validation", () => {
  it("rejects invalid UUIDs", () => {
    expect(() => assertValidUuid("not-a-uuid")).toThrow(AuthError);
  });

  it("accepts valid UUIDs", () => {
    expect(() =>
      assertValidUuid("550e8400-e29b-41d4-a716-446655440000"),
    ).not.toThrow();
  });
});

describe("MFA routes exist", () => {
  it("has setup and verify pages", async () => {
    const fs = await import("node:fs");
    expect(fs.existsSync("src/app/admin/mfa/setup/page.tsx")).toBe(true);
    expect(fs.existsSync("src/app/admin/mfa/verify/page.tsx")).toBe(true);
  });
});

describe("Admin access matrix documented", () => {
  it("ADMIN_ACCESS_MATRIX.md exists", async () => {
    const fs = await import("node:fs");
    expect(fs.existsSync("docs/ADMIN_ACCESS_MATRIX.md")).toBe(true);
  });
});
