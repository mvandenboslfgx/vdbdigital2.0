import "server-only";
import { calculateOrderTotals, sumLineItems } from "@/lib/utilities/vat";
import type { CartItem, CustomerInput, OrderLine, OrderTotals } from "@/types";
import { validateCartItems } from "@/features/cart/cart-service";
import { canCheckoutTogether } from "@/lib/utilities/checkout-rules";
import { isDirectCheckoutEnabled } from "@/config/features";

export { canCheckoutTogether };

export interface ValidatedCheckout {
  lines: OrderLine[];
  totals: OrderTotals;
  customer: CustomerInput;
}

export async function validateCheckout(
  customer: CustomerInput,
  cartItems: CartItem[],
): Promise<{ success: true; data: ValidatedCheckout } | { success: false; errors: string[] }> {
  if (!isDirectCheckoutEnabled()) {
    return { success: false, errors: ["Direct checkout is temporarily disabled"] };
  }

  const { items, errors } = await validateCartItems(
    { items: cartItems, updatedAt: "" },
    customer.customerType,
  );

  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (items.length === 0) {
    return { success: false, errors: ["Your cart is empty"] };
  }

  const lines: OrderLine[] = items.map((item) => {
    const product = item.validatedProduct;
    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quantity: item.quantity,
      unitPriceCents: item.validatedPriceCents,
      billingType: product.billingType,
      totalCents: item.validatedPriceCents * item.quantity,
      productSnapshot: {
        productId: product.id,
        sku: product.internalSku ?? null,
        slug: product.slug,
        name: product.name,
        categoryId: product.categoryId ?? null,
        categorySlug: product.categorySlug,
        priceMode: product.priceMode ?? null,
        unitPriceCents: item.validatedPriceCents,
        currency: product.currency ?? "EUR",
        vatPercent: product.vatPercent ?? 21,
        priceIncludesVat: product.priceIncludesVat ?? false,
        billingType: product.billingType,
        quantity: item.quantity,
        productVersion: product.version ?? 1,
        imageStoragePath: product.primaryImagePath ?? null,
      },
    };
  });

  const subtotalCents = sumLineItems(
    lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
  );
  const totals = calculateOrderTotals(subtotalCents);

  return {
    success: true,
    data: { lines, totals, customer },
  };
}
