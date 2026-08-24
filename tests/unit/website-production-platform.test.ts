import { describe, expect, it } from "vitest";
import {
  inferWebsitePackage,
  websiteMilestonesFor,
  websitePackageLabel,
  websiteTasksFor,
} from "@/lib/commerce/website-packages";
import { inferFulfillmentType } from "@/lib/commerce/fulfillment-type";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { readFileSync } from "node:fs";
import {
  commercialCtaLabel,
  resolveCommercialCtaKind,
} from "@/lib/commerce/commercial-cta";

describe("website package templates", () => {
  it("maps standard slugs and keeps custom on quote", () => {
    expect(inferWebsitePackage("onepage-website")).toBe("ONEPAGE");
    expect(inferWebsitePackage("launch-website")).toBe("LAUNCH");
    expect(inferWebsitePackage("growth-website")).toBe("GROWTH");
    expect(inferWebsitePackage("webshop-launch")).toBe("WEBSHOP");
    expect(inferWebsitePackage("custom-website")).toBe("CUSTOM");
    expect(websitePackageLabel("LAUNCH")).toBe("Launch Website");
  });

  it("always includes intake, preview, review, approval and launch", () => {
    for (const pkg of ["ONEPAGE", "LAUNCH", "GROWTH", "WEBSHOP"] as const) {
      const titles = websiteMilestonesFor(pkg).map((m) => m.title);
      expect(titles).toEqual(expect.arrayContaining([
        "Intake compleet",
        "Preview klaar",
        "Klantreview",
        "Goedkeuring",
        "Livegang",
      ]));
      expect(websiteTasksFor(pkg).some((t) => t.assignee === "CUSTOMER")).toBe(true);
    }
  });
});

describe("fulfillment website automation", () => {
  it("treats catalog probe and website slugs as WEBSITE_PROJECT", () => {
    expect(inferFulfillmentType("rc7-catalog-probe")).toBe("WEBSITE_PROJECT");
    expect(inferFulfillmentType("website-starter")).toBe("WEBSITE_PROJECT");
  });

  it("createProjectFromOrder is wired from the fulfillment engine", () => {
    const src = readFileSync("src/server/services/fulfillment/engine.ts", "utf8");
    expect(src).toContain("createProjectFromOrder");
    expect(src).toContain("WEBSITE_PROJECT");
    expect(src).not.toContain("queued_intake_project_link");
  });

  it("does not auto-allow production deploys", () => {
    const src = readFileSync(
      "src/server/services/website-production/create-project-from-order.ts",
      "utf8",
    );
    expect(src).toContain("productionDeployAllowed: false");
    expect(src).toContain("website_intakes");
    expect(src).toContain("source_order_id");
  });
});

describe("admin command center", () => {
  it("groups navigation into sales, commerce, delivery, partners and automation", () => {
    const ids = ADMIN_NAV_GROUPS.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "overview",
        "sales",
        "commerce",
        "delivery",
        "partners",
        "service",
        "automation",
        "manage",
      ]),
    );
    const hrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/admin/website-production");
    expect(hrefs).toContain("/admin/orders");
    expect(hrefs).toContain("/admin/automation");
  });
});

describe("commercial CTAs", () => {
  it("uses Bestellen / Abonneren / Configureer instead of quote-everywhere", () => {
    expect(commercialCtaLabel(resolveCommercialCtaKind({ quoteOnly: false }), "nl")).toBe(
      "Bestellen",
    );
    expect(
      commercialCtaLabel(
        resolveCommercialCtaKind({ quoteOnly: false, billingType: "YEARLY" }),
        "nl",
      ),
    ).toBe("Abonneren");
    expect(commercialCtaLabel(resolveCommercialCtaKind({ quoteOnly: true }), "nl")).toBe(
      "Configureer aanvraag",
    );
  });
});
