import type { OrderTotals } from "@/types";

/** Standaard NL BTW-tarief (21%) — centraal en testbaar */
export const DEFAULT_VAT_RATE = 0.21;

export function calculateVatFromSubtotal(
  subtotalCents: number,
  vatRate = DEFAULT_VAT_RATE,
): number {
  return Math.round(subtotalCents * vatRate);
}

export function calculateOrderTotals(
  subtotalCents: number,
  vatRate = DEFAULT_VAT_RATE,
): OrderTotals {
  const vatCents = calculateVatFromSubtotal(subtotalCents, vatRate);
  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
    vatRate,
  };
}

export function sumLineItems(
  items: Array<{ unitPriceCents: number; quantity: number }>,
): number {
  return items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}
