import { describe, expect, it } from "vitest";
import {
  assertSaleRespectsFloor,
  legalDiscountPercentage,
  marketDiscountPercentage,
  resolveInternalEconomics,
  resolvePublicPrice,
} from "@/lib/commerce/canonical-pricing";

describe("canonical catalog pricing", () => {
  it("does not treat market value as a public discount anchor", () => {
    const view = resolvePublicPrice({
      priceMode: "FIXED",
      marketPriceCents: 9995,
      retailPriceCents: 9995,
      salePriceCents: 7995,
    });
    expect(view.customerPriceCents).toBe(7995);
    expect(view.saleActive).toBe(true);
    expect(view.legalDiscountPercentage).toBeNull();
    expect(view.compareAtCents).toBeNull();
    expect(view.showMarketBenchmark).toBe(true);
    expect(view.marketPriceCents).toBe(9995);
  });

  it("allows a public strikethrough only from VDB lowest-price-30d history", () => {
    const view = resolvePublicPrice({
      priceMode: "FIXED",
      marketPriceCents: 10995,
      retailPriceCents: 9995,
      salePriceCents: 7995,
      lowestPrice30dCents: 9995,
    });
    expect(view.customerPriceCents).toBe(7995);
    expect(view.legalDiscountPercentage).toBe(20);
    expect(view.compareAtCents).toBe(9995);
    expect(view.showMarketBenchmark).toBe(false);
  });

  it("does not invent a discount when VDB price equals market value and has no cheaper history", () => {
    const view = resolvePublicPrice({
      priceMode: "FIXED",
      marketPriceCents: 9995,
      retailPriceCents: 9995,
    });
    expect(view.customerPriceCents).toBe(9995);
    expect(view.saleActive).toBe(false);
    expect(view.legalDiscountPercentage).toBeNull();
    expect(view.compareAtCents).toBeNull();
    expect(view.showMarketBenchmark).toBe(false);
  });

  it("blocks a sale below the minimum without OWNER approval", () => {
    const blocked = assertSaleRespectsFloor({
      priceMode: "FIXED",
      retailPriceCents: 9995,
      salePriceCents: 1995,
      minimumSalePriceCents: 5000,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe("PRICE_BELOW_FLOOR");
    }

    const allowed = assertSaleRespectsFloor({
      priceMode: "FIXED",
      retailPriceCents: 9995,
      salePriceCents: 1995,
      minimumSalePriceCents: 5000,
      belowFloorOwnerApproved: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("keeps supplier cost, margin and market-discount analytics internal", () => {
    const economics = resolveInternalEconomics({
      priceMode: "FIXED",
      marketPriceCents: 9995,
      retailPriceCents: 9995,
      salePriceCents: 7995,
      supplierCostCents: 2400,
      partnerCommissionType: "fixed_cents",
      partnerCommissionValue: 1500,
      vatPercent: 21,
      priceIncludesVat: true,
    });
    expect(economics.supplierCostCents).toBe(2400);
    expect(economics.partnerCommissionCents).toBe(1500);
    expect(economics.vatAmountCents).toBeGreaterThan(0);
    expect(economics.remainingMarginCents).toBe(
      7995 - 2400 - 1500 - (economics.vatAmountCents ?? 0),
    );
    expect(economics.marketDiscountPercentage).toBe(20);
  });

  it("computes legal discount from history and market discount only internally", () => {
    expect(legalDiscountPercentage(9995, 7995)).toBe(20);
    expect(legalDiscountPercentage(null, 7995)).toBeNull();
    expect(marketDiscountPercentage(9995, 7995)).toBe(20);
    expect(marketDiscountPercentage(2400, 7995)).toBeNull();
  });
});
