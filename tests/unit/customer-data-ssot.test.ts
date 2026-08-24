import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Customer data SSOT", () => {
  it("admin Klanten lists organizations, not auth users or the legacy customers table", () => {
    const page = readFileSync(
      "src/app/admin/(protected)/customers/page.tsx",
      "utf8",
    );
    const repo = readFileSync(
      "src/server/repositories/admin-portal.ts",
      "utf8",
    );

    expect(page).toContain('from "@/server/repositories/admin-portal"');
    expect(page).toContain("organizations, total");
    expect(repo).toContain('.from("organizations")');
    expect(repo).not.toContain('.from("customers")');
    expect(repo).not.toContain('.from("profiles")');
    expect(repo).not.toContain('.from("auth.users")');
  });

  it("portal customer access requires an ACTIVE organization membership", () => {
    const src = readFileSync("src/server/auth/require-customer.ts", "utf8");
    expect(src).toContain('.from("organization_members")');
    expect(src).toContain('.eq("status", "ACTIVE")');
    expect(src).toContain("isCustomerOrganizationStatus");
    expect(src).toContain('.from("organization_members")');
    expect(src).toContain('reason: "no_membership"');
  });

  it("staff with an admin_roles row are sent to admin, not the customer portal", () => {
    const src = readFileSync("src/server/auth/require-customer.ts", "utf8");
    expect(src).toContain('.from("admin_roles")');
    expect(src).toContain('redirectTo: "/admin"');
    expect(src).toContain("isStaff: true");
  });
});
