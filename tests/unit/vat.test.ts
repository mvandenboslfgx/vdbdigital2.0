import { describe, it, expect } from "vitest";
import {
  calculateOrderTotals,
  calculateVatFromSubtotal,
  sumLineItems,
  DEFAULT_VAT_RATE,
} from "@/lib/utilities/vat";

describe("VAT calculation", () => {
  it("calculates 21% VAT from subtotal", () => {
    expect(calculateVatFromSubtotal(10000)).toBe(2100);
  });

  it("calculates order totals correctly", () => {
    const totals = calculateOrderTotals(10000);
    expect(totals.subtotalCents).toBe(10000);
    expect(totals.vatCents).toBe(2100);
    expect(totals.totalCents).toBe(12100);
    expect(totals.vatRate).toBe(DEFAULT_VAT_RATE);
  });

  it("sums line items", () => {
    const total = sumLineItems([
      { unitPriceCents: 5000, quantity: 2 },
      { unitPriceCents: 3000, quantity: 1 },
    ]);
    expect(total).toBe(13000);
  });
});
