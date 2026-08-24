import { z } from "zod";
import type { Product } from "@/types";
import { resolveCustomerUnitPriceCents } from "@/lib/commerce/canonical-pricing";
import { isPublicShopProduct } from "@/lib/commerce/public-shop-gates";
import { resolvePriceMode } from "@/lib/commerce/checkout-eligibility";

export const commerceQuoteRequestSchema = z.object({
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(999).default(1),
  locale: z.enum(["nl", "en"]).optional(),
});

export type CommerceQuoteRequest = z.infer<typeof commerceQuoteRequestSchema>;

export type CommerceQuoteResult =
  | {
      ok: true;
      previewOnly: true;
      slug: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      currency: "EUR";
      vatPercent: number;
      billingType: Product["billingType"];
      priceMode: string;
      checkoutEligible: boolean;
    }
  | { ok: false; code: string; message: string };

export function quotePublicProduct(
  product: Product | null,
  quantity: number,
): CommerceQuoteResult {
  if (!product || !isPublicShopProduct(product)) {
    return {
      ok: false,
      code: "PRODUCT_NOT_FOUND",
      message: "Product is not publicly available",
    };
  }

  const min = product.minQuantity ?? 1;
  const max = product.maxQuantity ?? 99;
  if (quantity < min || quantity > max) {
    return {
      ok: false,
      code: "INVALID_QUANTITY",
      message: `Quantity must be between ${min} and ${max}`,
    };
  }

  const priceMode = resolvePriceMode(product);
  if (priceMode !== "FIXED") {
    return {
      ok: false,
      code: "QUOTE_REQUIRED",
      message: "This product requires a configured request rather than a fixed quote",
    };
  }

  const unitPriceCents = resolveCustomerUnitPriceCents({
    priceMode: product.priceMode,
    retailPriceCents: product.retailPriceCents ?? product.priceCents,
    salePriceCents: product.salePriceCents,
    saleStartsAt: product.saleStartsAt,
    saleEndsAt: product.saleEndsAt,
  });

  if (unitPriceCents == null || unitPriceCents <= 0) {
    return { ok: false, code: "QUOTE_REQUIRED", message: "No fixed public price" };
  }

  return {
    ok: true,
    previewOnly: true,
    slug: product.slug,
    quantity,
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
    currency: "EUR",
    vatPercent: product.vatPercent ?? 21,
    billingType: product.billingType,
    priceMode,
    checkoutEligible: product.billingType === "ONE_TIME",
  };
}
