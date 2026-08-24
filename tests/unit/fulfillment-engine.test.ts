import { describe, expect, it } from "vitest";
import { inferFulfillmentType } from "@/lib/commerce/fulfillment-type";

describe("fulfillment type inference", () => {
  it("maps catalog probe slugs to WEBSITE_PROJECT", () => {
    expect(inferFulfillmentType("rc7-catalog-probe")).toBe("WEBSITE_PROJECT");
  });

  it("maps yearly/license slugs to DIGITAL_LICENSE or SUBSCRIPTION", () => {
    expect(inferFulfillmentType("software-license")).toBe("DIGITAL_LICENSE");
    expect(inferFulfillmentType("jaarlicentie")).toBe("SUBSCRIPTION");
  });

  it("maps download and service slugs instead of defaulting everything to manual review", () => {
    expect(inferFulfillmentType("icon-pack-download")).toBe("DOWNLOAD");
    expect(inferFulfillmentType("support-service")).toBe("SERVICE");
  });

  it("keeps custom work on QUOTE_REQUIRED", () => {
    expect(inferFulfillmentType("custom-quote")).toBe("QUOTE_REQUIRED");
  });
});
