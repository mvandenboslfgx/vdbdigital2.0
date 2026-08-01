import { describe, it, expect, vi, afterEach } from "vitest";
import {
  resolvePriceMode,
  canAddToDirectCheckout,
  assertCheckoutAllowedForCustomer,
  isRecurringBilling,
} from "@/lib/commerce/checkout-eligibility";
import type { Product } from "@/types";
import { isDirectCheckoutEnabled } from "@/config/features";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "starter-website",
    name: "Starter Website",
    shortDescription: "",
    fullDescription: "",
    categorySlug: "websites",
    categoryName: "Websites",
    priceCents: 149900,
    fromPriceCents: null,
    billingType: "ONE_TIME",
    deliveryTime: "",
    includedItems: [],
    excludedItems: [],
    extensions: [],
    faqs: [],
    status: "PUBLISHED",
    featured: false,
    sortOrder: 1,
    seoTitle: "",
    seoDescription: "",
    ...overrides,
  };
}

describe("checkout eligibility / price modes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves FIXED, STARTING_FROM and QUOTE_ONLY", () => {
    expect(resolvePriceMode(baseProduct())).toBe("FIXED");
    expect(
      resolvePriceMode(baseProduct({ priceCents: null, fromPriceCents: 499900 })),
    ).toBe("STARTING_FROM");
    expect(
      resolvePriceMode(baseProduct({ priceCents: null, billingType: "QUOTE_ONLY" })),
    ).toBe("QUOTE_ONLY");
  });

  it("treats MONTHLY/YEARLY as recurring", () => {
    expect(isRecurringBilling("MONTHLY")).toBe(true);
    expect(isRecurringBilling("YEARLY")).toBe(true);
    expect(isRecurringBilling("ONE_TIME")).toBe(false);
  });

  it("keeps direct checkout OFF by default", () => {
    expect(isDirectCheckoutEnabled()).toBe(false);
    expect(canAddToDirectCheckout(baseProduct())).toBe(false);
  });

  it("rejects starting-from and monthly even when checkout flag is on", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    expect(
      canAddToDirectCheckout(
        baseProduct({ priceCents: null, fromPriceCents: 499900, slug: "launch-website" }),
      ),
    ).toBe(false);
    expect(
      canAddToDirectCheckout(
        baseProduct({ billingType: "MONTHLY", slug: "launch-website", priceCents: 19900 }),
      ),
    ).toBe(false);
  });

  it("rejects products without legal catalog approval when checkout is enabled", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    // starter-website is a seed slug without approved commercial catalog legal gate
    expect(canAddToDirectCheckout(baseProduct({ slug: "starter-website" }))).toBe(false);
    expect(
      assertCheckoutAllowedForCustomer(baseProduct({ slug: "starter-website" }), "B2B"),
    ).toMatch(/not approved/i);
  });

  it("rejects B2C when legal status is not B2C-approved", () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    // growth-care is B2B-only in the commercial catalog (APPROVED_FOR_B2B).
    const product = baseProduct({ slug: "growth-care", priceCents: 19900 });
    expect(assertCheckoutAllowedForCustomer(product, "B2C")).toMatch(/not approved/i);
    expect(assertCheckoutAllowedForCustomer(product, "B2B")).toBeNull();
  });
});
