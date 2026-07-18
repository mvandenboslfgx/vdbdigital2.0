import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  sanitizeFeedbackBody,
  slugifyProjectName,
  updateProjectSchema,
} from "@/lib/validation/projects";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { PROJECT_STATUS_NL, labelNl } from "@/lib/portal/labels";
import { audienceSafeInternalPath } from "@/lib/security/redirect";

describe("project validation", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440000";

  it("requires organization and name for create", () => {
    const ok = createProjectSchema.safeParse({
      organizationId: orgId,
      name: "Website herbouw",
      projectType: "WEBSITE",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.visibility).toBe("INTERNAL");
      expect(ok.data.status).toBe("DRAFT");
    }
  });

  it("rejects progress outside 0–100", () => {
    const bad = updateProjectSchema.safeParse({
      projectId: orgId,
      expectedVersion: 1,
      name: "x",
      projectType: "OTHER",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      visibility: "INTERNAL",
      progressPercent: 140,
    });
    expect(bad.success).toBe(false);
  });

  it("sanitizes feedback HTML / scripts", () => {
    expect(sanitizeFeedbackBody('<script>alert(1)</script>Hallo')).toBe(
      "Hallo",
    );
    expect(sanitizeFeedbackBody("javascript:alert(1)")).toBe("alert(1)");
  });

  it("slugifies names safely", () => {
    expect(slugifyProjectName("Mijn Project!")).toBe("mijn-project");
  });
});

describe("project permissions", () => {
  it("CONTENT cannot create/archive but can manage milestones", () => {
    expect(hasPermission("CONTENT", "projects.create")).toBe(false);
    expect(hasPermission("CONTENT", "projects.archive")).toBe(false);
    expect(hasPermission("CONTENT", "projects.manage_milestones")).toBe(true);
    expect(hasPermission("CONTENT", "projects.view_assigned")).toBe(true);
  });

  it("ADMIN has operational project rights", () => {
    expect(hasPermission("ADMIN", "projects.create")).toBe(true);
    expect(hasPermission("ADMIN", "projects.manage_actions")).toBe(true);
  });

  it("VIEW_ONLY can view but not mutate portal projects", () => {
    expect(hasCustomerPermission("VIEW_ONLY", "portal.projects.view")).toBe(
      true,
    );
    expect(
      hasCustomerPermission("VIEW_ONLY", "portal.projects.complete_action"),
    ).toBe(false);
    expect(
      hasCustomerPermission("MEMBER", "portal.projects.approve_deliverable"),
    ).toBe(true);
  });
});

describe("project status labels NL", () => {
  it("uses understandable Dutch labels", () => {
    expect(labelNl(PROJECT_STATUS_NL, "WAITING_FOR_CUSTOMER")).toBe(
      "Wacht op klant",
    );
    expect(labelNl(PROJECT_STATUS_NL, "REVIEW")).toBe("Ter beoordeling");
    expect(labelNl(PROJECT_STATUS_NL, "ON_HOLD")).toBe("Gepauzeerd");
  });
});

describe("audience redirects remain staff/customer safe", () => {
  it("blocks customer next=/admin and staff next=/portal", () => {
    expect(audienceSafeInternalPath("/admin", "customer", "/portal")).toBe(
      "/portal",
    );
    expect(audienceSafeInternalPath("/portal", "staff", "/admin")).toBe(
      "/admin",
    );
    expect(
      audienceSafeInternalPath("/portal/projecten", "customer", "/portal"),
    ).toBe("/portal/projecten");
  });
});
