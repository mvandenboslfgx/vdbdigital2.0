import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertCheckoutAllowedForCustomer,
  canAddToDirectCheckout,
  resolvePriceMode,
} from "@/lib/commerce/checkout-eligibility";
import { buildP05Product } from "@/config/commercial/p05-test-sku";

describe("P0.5 FIXED SKU eligibility chain", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks everything while CHECKOUT_ENABLED is off", () => {
    const product = buildP05Product();
    expect(canAddToDirectCheckout(product)).toBe(false);
  });

  it("allows FIXED + B2B-approved fixture when flag on (test catalog opt-in)", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    vi.stubEnv("P05_INCLUDE_APPROVED_SKU", "1");
    vi.stubEnv("P05_APPROVAL_MODE", "b2b");
    const product = buildP05Product();
    expect(resolvePriceMode(product)).toBe("FIXED");
    expect(canAddToDirectCheckout(product)).toBe(true);
    expect(assertCheckoutAllowedForCustomer(product, "B2B")).toBeNull();
    expect(assertCheckoutAllowedForCustomer(product, "B2C")).toMatch(/not approved/i);
  });

  it("blocks B2B customer when only B2C approved", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    vi.stubEnv("P05_INCLUDE_APPROVED_SKU", "1");
    vi.stubEnv("P05_APPROVAL_MODE", "b2c");
    const product = buildP05Product();
    expect(assertCheckoutAllowedForCustomer(product, "B2B")).toMatch(/not approved/i);
    expect(assertCheckoutAllowedForCustomer(product, "B2C")).toBeNull();
  });

  it("blocks STARTING_FROM and MONTHLY/YEARLY", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    vi.stubEnv("P05_INCLUDE_APPROVED_SKU", "1");
    vi.stubEnv("P05_APPROVAL_MODE", "both");
    expect(
      assertCheckoutAllowedForCustomer(
        buildP05Product({ priceCents: null, fromPriceCents: 50000 }),
        "B2B",
      ),
    ).toMatch(/starting-from|quote/i);
    expect(
      assertCheckoutAllowedForCustomer(
        buildP05Product({ billingType: "MONTHLY" }),
        "B2B",
      ),
    ).toMatch(/recurring/i);
    expect(
      assertCheckoutAllowedForCustomer(
        buildP05Product({ billingType: "YEARLY" }),
        "B2B",
      ),
    ).toMatch(/recurring/i);
  });

  it("blocks unpublished and missing price", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    vi.stubEnv("P05_INCLUDE_APPROVED_SKU", "1");
    vi.stubEnv("P05_APPROVAL_MODE", "both");
    expect(canAddToDirectCheckout(buildP05Product({ status: "DRAFT" }))).toBe(false);
    expect(
      assertCheckoutAllowedForCustomer(
        buildP05Product({ priceCents: null, fromPriceCents: null, billingType: "ONE_TIME" }),
        "B2B",
      ),
    ).not.toBeNull();
  });
});
