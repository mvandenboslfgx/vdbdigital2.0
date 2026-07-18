/**
 * Quote money in minor units (cents) + tax basis points.
 * No floating VAT rate as source of truth.
 */
export type QuoteLineInput = {
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  taxRateBasisPoints?: number;
  isOptional?: boolean;
  isSelected?: boolean;
};

export type QuoteLineTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

/** Round half-up: (net * bp + 5000) / 10000 */
export function taxCentsFromNet(
  netCents: number,
  taxRateBasisPoints: number,
): number {
  if (!Number.isFinite(netCents) || !Number.isFinite(taxRateBasisPoints)) {
    return 0;
  }
  const net = Math.trunc(netCents);
  const bp = Math.trunc(taxRateBasisPoints);
  if (net <= 0 || bp <= 0) return 0;
  return Math.floor((net * bp + 5000) / 10000);
}

export function lineTotals(input: QuoteLineInput): QuoteLineTotals {
  const qty = Number(input.quantity);
  const unit = Math.trunc(input.unitPriceCents);
  const discount = Math.max(0, Math.trunc(input.discountCents ?? 0));
  const bp = Math.trunc(input.taxRateBasisPoints ?? 2100);

  if (!Number.isFinite(qty) || qty <= 0) {
    return { subtotalCents: 0, taxCents: 0, totalCents: 0 };
  }

  const gross = Math.round(qty * unit);
  const net = Math.max(gross - discount, 0);
  const tax = taxCentsFromNet(net, bp);
  return {
    subtotalCents: net,
    taxCents: tax,
    totalCents: net + tax,
  };
}

export function quoteHeaderTotals(
  lines: QuoteLineInput[],
  headerDiscountCents = 0,
): QuoteLineTotals & { discountCents: number } {
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    if (line.isOptional && line.isSelected === false) continue;
    const t = lineTotals(line);
    subtotal += t.subtotalCents;
    tax += t.taxCents;
  }
  const discount = Math.max(0, Math.trunc(headerDiscountCents));
  const afterDiscount = Math.max(subtotal - discount, 0);
  // Recalculate tax proportionally when header discount applied (simple: tax on remaining at blended)
  // Prefer: reduce subtotal, keep tax proportional to remaining subtotal ratio
  if (discount > 0 && subtotal > 0) {
    const ratio = afterDiscount / subtotal;
    const adjTax = Math.floor(tax * ratio + 0.5);
    return {
      subtotalCents: afterDiscount,
      taxCents: adjTax,
      totalCents: afterDiscount + adjTax,
      discountCents: discount,
    };
  }
  return {
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: subtotal + tax,
    discountCents: 0,
  };
}

export function isQuoteAcceptableStatus(status: string): boolean {
  return status === "SENT" || status === "VIEWED";
}

export function isQuoteExpired(validUntil: string | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  const day = validUntil.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return day < today;
}
