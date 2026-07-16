import { describe, it, expect } from "vitest";
import { canCheckoutTogether } from "@/lib/utilities/checkout-rules";
import type { OrderLine } from "@/types";

describe("Checkout rules", () => {
  it("allows paid items together", () => {
    const lines: OrderLine[] = [
      {
        productId: "1",
        productName: "Website",
        productSlug: "website",
        quantity: 1,
        unitPriceCents: 100000,
        billingType: "ONE_TIME",
        totalCents: 100000,
      },
    ];
    expect(canCheckoutTogether(lines)).toBe(true);
  });

  it("blocks quote with paid items", () => {
    const lines: OrderLine[] = [
      {
        productId: "1",
        productName: "Maatwerk",
        productSlug: "maatwerk",
        quantity: 1,
        unitPriceCents: 0,
        billingType: "QUOTE_ONLY",
        totalCents: 0,
      },
      {
        productId: "2",
        productName: "Website",
        productSlug: "website",
        quantity: 1,
        unitPriceCents: 100000,
        billingType: "ONE_TIME",
        totalCents: 100000,
      },
    ];
    expect(canCheckoutTogether(lines)).toBe(false);
  });
});
