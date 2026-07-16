import { describe, it, expect } from "vitest";
import {
  foundingClientOfferConfig,
  isFoundingCampaignWithinDates,
} from "@/config/commercial/founding-client-offer";
import { websitePackages } from "@/config/commercial/website-packages";
import { carePackages } from "@/config/commercial/care-packages";
import { commercialBundles } from "@/config/commercial/bundles";
import {
  getPublicCases,
  isCasePubliclyVisible,
} from "@/config/commercial/cases";
import {
  isBookingConfigured,
  isBookingUrlSafe,
  resolveBooking,
} from "@/config/commercial/booking";
import {
  commercialCatalog,
  assertVatConsistency,
  canPublishForB2c,
  priceFromExclEuros,
  getCatalogItem,
} from "@/config/commercial/pricing";
import { seedProducts } from "@/config/products.seed";
import { getProductPublicationAdvice } from "@/i18n/localize-product";
import { quoteFormSchema } from "@/lib/validation/forms";

describe("Commercial completion sprint", () => {
  it("defines four website packages linked to catalog", () => {
    expect(websitePackages).toHaveLength(4);
    for (const pkg of websitePackages) {
      expect(getCatalogItem(pkg.catalogSlug)).toBeDefined();
    }
  });

  it("defines four care packages", () => {
    expect(carePackages).toHaveLength(4);
  });

  it("defines five combo bundles", () => {
    expect(commercialBundles).toHaveLength(5);
  });

  it("stores package prices in cents with exact VAT", () => {
    const onepage = getCatalogItem("onepage-website");
    expect(onepage?.pricing?.exclVatCents).toBe(995_00);
    expect(onepage?.pricing?.inclVatCents).toBe(1203_95);
    expect(assertVatConsistency(onepage!.pricing!)).toBe(true);
  });

  it("keeps B2B and B2C amounts linked via same excl base", () => {
    const launch = getCatalogItem("launch-website")!;
    const recomputed = priceFromExclEuros(launch.pricing!.exclVatCents / 100);
    expect(recomputed.inclVatCents).toBe(launch.pricing!.inclVatCents);
  });

  it("blocks B2C publication without legal approval", () => {
    for (const item of commercialCatalog) {
      expect(canPublishForB2c(item)).toBe(false);
    }
  });

  it("keeps Custom Website proposal-only", () => {
    expect(getCatalogItem("custom-website")?.quoteOnly).toBe(true);
  });

  it("founding offer respects max and stays disabled", () => {
    expect(foundingClientOfferConfig.maxClients).toBeLessThanOrEqual(10);
    expect(foundingClientOfferConfig.enabled).toBe(false);
    expect(foundingClientOfferConfig.discountApproved).toBe(false);
  });

  it("does not implement fake countdown timers in founding bar", async () => {
    const fs = await import("node:fs");
    const bar = fs.readFileSync("src/components/commercial/founding-client-bar.tsx", "utf8");
    expect(bar).not.toMatch(/setInterval|useCountdown|CountdownTimer|countdownTimer/i);
  });

  it("keeps Vermeulen case non-public until approved", () => {
    expect(isCasePubliclyVisible("vermeulen-bouwservice")).toBe(false);
  });

  it("labels demonstrations in public case list", () => {
    const publicCases = getPublicCases();
    expect(publicCases.every((c) => c.type === "demonstration" || c.type === "internal")).toBe(
      true,
    );
  });

  it("concept seed products require scope review when marked concept", () => {
    for (const product of seedProducts) {
      const conceptProduct = { ...product, status: "DRAFT" as const, is_concept: true };
      expect(getProductPublicationAdvice(conceptProduct)).toBe("SCOPE_REVIEW_REQUIRED");
    }
  });

  it("booking fallback when URL missing", () => {
    expect(isBookingConfigured()).toBe(false);
    expect(resolveBooking().available).toBe(false);
  });

  it("rejects unsafe booking URLs", () => {
    expect(isBookingUrlSafe("javascript:alert(1)")).toBe(false);
    expect(isBookingUrlSafe("not-a-url")).toBe(false);
    expect(isBookingUrlSafe("https://cal.com/vdb/intro")).toBe(true);
  });

  it("quote form requires customer type and privacy consent", () => {
    const missing = quoteFormSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      projectType: "Website",
      description: "Need a site",
      locale: "en",
    });
    expect(missing.success).toBe(false);

    const consumer = quoteFormSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      customerType: "consumer",
      projectType: "Website",
      goals: "Need a professional website for my local service business.",
      meetingPreference: "online",
      privacyConsent: true,
      locale: "en",
    });
    expect(consumer.success).toBe(true);

    const businessNoCompany = quoteFormSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      customerType: "business",
      projectType: "Website",
      goals: "Need a professional website for my local service business.",
      meetingPreference: "online",
      privacyConsent: true,
      locale: "en",
    });
    expect(businessNoCompany.success).toBe(false);
  });

  it("founding date window helper works", () => {
    expect(typeof isFoundingCampaignWithinDates()).toBe("boolean");
  });

  it("catalog VAT examples match public figures", () => {
    expect(getCatalogItem("growth-website")?.pricing?.exclVatCents).toBe(2995_00);
    expect(getCatalogItem("growth-website")?.pricing?.inclVatCents).toBe(3623_95);
    expect(getCatalogItem("webshop-launch")?.pricing?.exclVatCents).toBe(3995_00);
    expect(getCatalogItem("essential-care")?.pricing?.exclVatCents).toBe(69_00);
    expect(getCatalogItem("essential-care")?.pricing?.inclVatCents).toBe(83_49);
  });
});
