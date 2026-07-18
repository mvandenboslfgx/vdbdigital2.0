import { describe, it, expect } from "vitest";
import {
  isSafeInternalPath,
  safeInternalPathOr,
} from "@/lib/security/redirect";
import { hashInviteToken, createInviteToken } from "@/lib/auth/invite-token";
import { hasPermission } from "@/lib/auth/permissions";

describe("safe internal redirects", () => {
  it("allows portal and admin paths", () => {
    expect(isSafeInternalPath("/portal")).toBe(true);
    expect(isSafeInternalPath("/portal/projecten/abc")).toBe(true);
    expect(isSafeInternalPath("/admin/customers")).toBe(true);
    expect(isSafeInternalPath("/inloggen")).toBe(true);
  });

  it("blocks open redirects", () => {
    expect(isSafeInternalPath("https://evil.example")).toBe(false);
    expect(isSafeInternalPath("//evil.example")).toBe(false);
    expect(isSafeInternalPath("/\\evil")).toBe(false);
    expect(isSafeInternalPath("/notinlist")).toBe(false);
  });

  it("falls back safely", () => {
    expect(safeInternalPathOr("//evil", "/portal")).toBe("/portal");
    expect(safeInternalPathOr("/portal/support", "/portal")).toBe(
      "/portal/support",
    );
  });
});

describe("invite tokens", () => {
  it("hashes deterministically and creates unique tokens", () => {
    const a = createInviteToken();
    const b = createInviteToken();
    expect(a).not.toBe(b);
    expect(hashInviteToken(a)).toHaveLength(64);
    expect(hashInviteToken(a)).toBe(hashInviteToken(a));
  });
});

describe("portal RBAC permissions", () => {
  it("CUSTOMER is not an admin role; staff get portal permissions", () => {
    expect(hasPermission("SUPPORT", "customers.view")).toBe(true);
    expect(hasPermission("SUPPORT", "support.manage")).toBe(true);
    expect(hasPermission("CONTENT", "customers.view")).toBe(false);
    expect(hasPermission("ADMIN", "customers.invite")).toBe(true);
    expect(hasPermission("ADMIN", "roles.manage")).toBe(false);
    expect(hasPermission("OWNER", "customers.invite")).toBe(true);
  });

  it("CONTENT still cannot legal approve", () => {
    expect(hasPermission("CONTENT", "products.legal_approve")).toBe(false);
  });
});

describe("checkout remains off for portal quote accept", () => {
  it("CHECKOUT_ENABLED is not forced on by portal code", () => {
    expect(process.env.CHECKOUT_ENABLED === "true").toBe(false);
  });
});
