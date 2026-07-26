import { describe, expect, it } from "vitest";
import {
  buildAssignedRecordOrFilter,
  intersectCallerOrganizationFilter,
  resolveDocumentScopeMode,
  resolveQuoteInvoiceScopeMode,
} from "@/server/auth/admin-resource-scope";
import type { AdminRole } from "@/types";

describe("admin resource scope modes", () => {
  it("gives CONTENT assigned-only quote scope", () => {
    expect(resolveQuoteInvoiceScopeMode("CONTENT" as AdminRole, "quotes")).toBe(
      "assigned",
    );
  });

  it("gives SUPPORT assigned invoice scope without view_all", () => {
    expect(resolveQuoteInvoiceScopeMode("SUPPORT" as AdminRole, "invoices")).toBe(
      "assigned",
    );
  });

  it("gives ADMIN all quote/invoice scope", () => {
    expect(resolveQuoteInvoiceScopeMode("ADMIN" as AdminRole, "quotes")).toBe("all");
    expect(resolveQuoteInvoiceScopeMode("ADMIN" as AdminRole, "invoices")).toBe("all");
  });

  it("scopes documents: CONTENT/SUPPORT organization, ADMIN all", () => {
    expect(resolveDocumentScopeMode("CONTENT" as AdminRole)).toBe("organization");
    expect(resolveDocumentScopeMode("SUPPORT" as AdminRole)).toBe("organization");
    expect(resolveDocumentScopeMode("ADMIN" as AdminRole)).toBe("all");
  });

  it("builds assigned or-filter with created_by and project ids", () => {
    expect(buildAssignedRecordOrFilter("user-1", [])).toBe("created_by.eq.user-1");
    expect(buildAssignedRecordOrFilter("user-1", ["p1", "p2"])).toBe(
      "created_by.eq.user-1,project_id.in.(p1,p2)",
    );
  });

  it("never widens caller organization filter beyond allowed set", () => {
    expect(intersectCallerOrganizationFilter("all", "org-b")).toEqual(["org-b"]);
    expect(intersectCallerOrganizationFilter(["org-a"], "org-b")).toBe("none");
    expect(intersectCallerOrganizationFilter(["org-a", "org-b"], "org-b")).toEqual([
      "org-b",
    ]);
    expect(intersectCallerOrganizationFilter(["org-a"], undefined)).toEqual(["org-a"]);
  });
});
