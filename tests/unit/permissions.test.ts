import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasMinRole,
  canAssignRole,
  canRemoveOwner,
  SENSITIVE_PERMISSIONS,
  getPermissionsForRole,
} from "@/lib/auth/permissions";

describe("RBAC permissions", () => {
  it("CONTENT can update product text but not publish or change price", () => {
    expect(hasPermission("CONTENT", "products.update")).toBe(true);
    expect(hasPermission("CONTENT", "products.publish")).toBe(false);
    expect(hasPermission("CONTENT", "products.change_price")).toBe(false);
  });

  it("SUPPORT can read orders and leads but not change prices", () => {
    expect(hasPermission("SUPPORT", "orders.read")).toBe(true);
    expect(hasPermission("SUPPORT", "leads.read")).toBe(true);
    expect(hasPermission("SUPPORT", "products.change_price")).toBe(false);
    expect(hasPermission("SUPPORT", "payments.refund")).toBe(false);
  });

  it("ADMIN cannot manage roles", () => {
    expect(hasPermission("ADMIN", "roles.manage")).toBe(false);
    expect(hasPermission("ADMIN", "products.publish")).toBe(true);
  });

  it("OWNER has full permissions including roles and refunds", () => {
    expect(hasPermission("OWNER", "roles.manage")).toBe(true);
    expect(hasPermission("OWNER", "payments.refund")).toBe(true);
    expect(hasPermission("OWNER", "settings.manage")).toBe(true);
  });

  it("deny by default for unknown permission on CONTENT", () => {
    expect(hasPermission("CONTENT", "audit.read")).toBe(false);
  });
});

describe("Role hierarchy", () => {
  it("hasMinRole respects hierarchy", () => {
    expect(hasMinRole("ADMIN", "SUPPORT")).toBe(true);
    expect(hasMinRole("SUPPORT", "ADMIN")).toBe(false);
  });
});

describe("Role assignment rules", () => {
  it("ADMIN cannot assign OWNER", () => {
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
    expect(canAssignRole("OWNER", "ADMIN")).toBe(true);
  });

  it("only OWNER can remove OWNER", () => {
    expect(canRemoveOwner("ADMIN")).toBe(false);
    expect(canRemoveOwner("OWNER")).toBe(true);
  });
});

describe("Sensitive permissions require AAL2", () => {
  it("marks critical permissions as sensitive", () => {
    expect(SENSITIVE_PERMISSIONS.has("roles.manage")).toBe(true);
    expect(SENSITIVE_PERMISSIONS.has("payments.refund")).toBe(true);
    expect(SENSITIVE_PERMISSIONS.has("products.legal_approve")).toBe(true);
    expect(SENSITIVE_PERMISSIONS.has("products.read")).toBe(false);
  });
});

describe("Catalog admin permissions", () => {
  it("CONTENT cannot publish, change price, legal approve, or import", () => {
    expect(hasPermission("CONTENT", "products.publish")).toBe(false);
    expect(hasPermission("CONTENT", "products.change_price")).toBe(false);
    expect(hasPermission("CONTENT", "products.legal_approve")).toBe(false);
    expect(hasPermission("CONTENT", "products.import")).toBe(false);
    expect(hasPermission("CONTENT", "categories.manage")).toBe(false);
  });

  it("ADMIN can manage catalog but not legal approval", () => {
    expect(hasPermission("ADMIN", "categories.manage")).toBe(true);
    expect(hasPermission("ADMIN", "products.archive")).toBe(true);
    expect(hasPermission("ADMIN", "products.export")).toBe(true);
    expect(hasPermission("ADMIN", "products.legal_approve")).toBe(false);
  });

  it("OWNER can legal approve", () => {
    expect(hasPermission("OWNER", "products.legal_approve")).toBe(true);
  });
});

describe("Role permission sets", () => {
  it("each role has a non-empty permission set", () => {
    for (const role of ["CONTENT", "SUPPORT", "ADMIN", "OWNER"] as const) {
      expect(getPermissionsForRole(role).length).toBeGreaterThan(0);
    }
  });
});
