import { describe, it, expect } from "vitest";
import { formatCents, formatPriceLabel } from "@/lib/utilities/money";

describe("Money formatting", () => {
  it("formats cents to EUR", () => {
    expect(formatCents(149900)).toMatch(/1[,.]499/);
  });

  it("shows quote only label", () => {
    expect(formatPriceLabel(null, null, "QUOTE_ONLY")).toBe("On quote");
  });

  it("shows monthly price", () => {
    const result = formatPriceLabel(19900, null, "MONTHLY");
    expect(result).toContain("/month");
  });

  it("shows Dutch quote and monthly labels", () => {
    expect(formatPriceLabel(null, null, "QUOTE_ONLY", "nl")).toBe("Op offerte");
    expect(formatPriceLabel(19900, null, "MONTHLY", "nl")).toContain("/maand");
  });
});
