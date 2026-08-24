/**
 * Canonical VDB commercial pricing.
 *
 * Hard rule: `market_price` is never a public discount anchor.
 * Strikethrough prices and public % off come only from VDB price history
 * (`lowest_price_30d`). Market value may be shown as a labeled benchmark.
 * `minimum_sale_price` is a fail-closed commercial floor; only OWNER may override.
 * Supplier cost and market-vs-VDB analytics stay internal.
 */
export type PriceMode = "FIXED" | "STARTING_FROM" | "QUOTE_ONLY";

export interface CanonicalPriceInput {
  priceMode?: PriceMode | null;
  marketPriceCents?: number | null;
  retailPriceCents?: number | null;
  salePriceCents?: number | null;
  saleStartsAt?: string | Date | null;
  saleEndsAt?: string | Date | null;
  partnerPriceCents?: number | null;
  supplierCostCents?: number | null;
  partnerCommissionType?: string | null;
  partnerCommissionValue?: number | null;
  minimumSalePriceCents?: number | null;
  belowFloorOwnerApproved?: boolean;
  lowestPrice30dCents?: number | null;
  vatPercent?: number | null;
  priceIncludesVat?: boolean;
  now?: Date;
}

export interface PublicPriceView {
  marketPriceCents: number | null;
  retailPriceCents: number | null;
  salePriceCents: number | null;
  customerPriceCents: number | null;
  saleActive: boolean;
  lowestPrice30dCents: number | null;
  legalDiscountPercentage: number | null;
  compareAtCents: number | null;
  showMarketBenchmark: boolean;
}

export interface InternalEconomics {
  supplierCostCents: number | null;
  partnerCommissionCents: number | null;
  vatAmountCents: number | null;
  remainingMarginCents: number | null;
  remainingMarginPercentage: number | null;
  marketDiscountPercentage: number | null;
}

export type PriceFloorResult =
  | { ok: true }
  | {
      ok: false;
      code: "PRICE_BELOW_FLOOR";
      customerPriceCents: number;
      minimumSalePriceCents: number;
    };

function asPositiveInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function asNonNegativeInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

export function isSaleWindowActive(
  input: CanonicalPriceInput,
  now = input.now ?? new Date(),
): boolean {
  const sale = asPositiveInt(input.salePriceCents);
  if (sale == null) return false;
  const start = input.saleStartsAt ? new Date(input.saleStartsAt) : null;
  const end = input.saleEndsAt ? new Date(input.saleEndsAt) : null;
  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;
  if (start && now < start) return false;
  if (end && now >= end) return false;
  return true;
}

export function resolveCustomerUnitPriceCents(input: CanonicalPriceInput): number | null {
  if (input.priceMode === "QUOTE_ONLY") return null;
  if (isSaleWindowActive(input)) {
    return asPositiveInt(input.salePriceCents);
  }
  return asPositiveInt(input.retailPriceCents);
}

export function discountPercentageFromAnchor(
  anchorCents: number | null,
  customerPriceCents: number | null,
): number | null {
  const anchor = asPositiveInt(anchorCents);
  const customer = asPositiveInt(customerPriceCents);
  if (anchor == null || customer == null || customer >= anchor) return null;
  return Math.round(((anchor - customer) / anchor) * 100);
}

/** Internal analytics only. Never use as a public strikethrough or % off. */
export function marketDiscountPercentage(
  marketPriceCents: number | null,
  customerPriceCents: number | null,
): number | null {
  return discountPercentageFromAnchor(marketPriceCents, customerPriceCents);
}

export function legalDiscountPercentage(
  lowestPrice30dCents: number | null,
  customerPriceCents: number | null,
): number | null {
  return discountPercentageFromAnchor(lowestPrice30dCents, customerPriceCents);
}

export function resolvePublicPrice(input: CanonicalPriceInput): PublicPriceView {
  const retailPriceCents = asPositiveInt(input.retailPriceCents);
  const marketPriceCents = asPositiveInt(input.marketPriceCents);
  const saleActive = isSaleWindowActive(input);
  const salePriceCents = asPositiveInt(input.salePriceCents);
  const customerPriceCents = resolveCustomerUnitPriceCents(input);
  const lowestPrice30dCents = asPositiveInt(input.lowestPrice30dCents);
  const legalPct = legalDiscountPercentage(lowestPrice30dCents, customerPriceCents);
  const compareAtCents = legalPct != null ? lowestPrice30dCents : null;
  const showMarketBenchmark =
    legalPct == null &&
    marketPriceCents != null &&
    customerPriceCents != null &&
    marketPriceCents !== customerPriceCents;

  return {
    marketPriceCents,
    retailPriceCents,
    salePriceCents: saleActive ? salePriceCents : input.salePriceCents ?? null,
    customerPriceCents,
    saleActive,
    lowestPrice30dCents,
    legalDiscountPercentage: legalPct,
    compareAtCents,
    showMarketBenchmark,
  };
}

export function assertSaleRespectsFloor(input: CanonicalPriceInput): PriceFloorResult {
  const minimum = asPositiveInt(input.minimumSalePriceCents);
  const customer = resolveCustomerUnitPriceCents(input);
  if (minimum == null || customer == null) return { ok: true };
  if (customer >= minimum) return { ok: true };
  if (input.belowFloorOwnerApproved === true) return { ok: true };
  return {
    ok: false,
    code: "PRICE_BELOW_FLOOR",
    customerPriceCents: customer,
    minimumSalePriceCents: minimum,
  };
}

export function partnerCommissionCents(
  customerPriceCents: number | null,
  type: string | null | undefined,
  value: number | null | undefined,
): number | null {
  const customer = asPositiveInt(customerPriceCents);
  if (customer == null || value == null || !Number.isFinite(value)) return null;
  if (type === "fixed_cents" || type === "fixed") return asNonNegativeInt(value);
  if (type === "bps") return asNonNegativeInt(Math.round((customer * value) / 10_000));
  return null;
}

export function resolveInternalEconomics(input: CanonicalPriceInput): InternalEconomics {
  const publicPrice = resolvePublicPrice(input);
  const customer = publicPrice.customerPriceCents;
  const supplierCostCents = asNonNegativeInt(input.supplierCostCents);
  const commission = partnerCommissionCents(
    customer,
    input.partnerCommissionType,
    input.partnerCommissionValue,
  );
  const vatPercent = input.vatPercent ?? 21;
  let vatAmountCents: number | null = null;
  if (customer != null && vatPercent > 0) {
    vatAmountCents = input.priceIncludesVat
      ? Math.round(customer - customer / (1 + vatPercent / 100))
      : Math.round(customer * (vatPercent / 100));
  }

  let remainingMarginCents: number | null = null;
  if (customer != null && supplierCostCents != null) {
    const vatTaken = input.priceIncludesVat ? (vatAmountCents ?? 0) : 0;
    remainingMarginCents = customer - supplierCostCents - (commission ?? 0) - vatTaken;
  }

  const remainingMarginPercentage =
    remainingMarginCents != null && customer != null && customer > 0
      ? Math.round((remainingMarginCents / customer) * 100)
      : null;

  return {
    supplierCostCents,
    partnerCommissionCents: commission,
    vatAmountCents,
    remainingMarginCents,
    remainingMarginPercentage,
    marketDiscountPercentage: marketDiscountPercentage(publicPrice.marketPriceCents, customer),
  };
}

