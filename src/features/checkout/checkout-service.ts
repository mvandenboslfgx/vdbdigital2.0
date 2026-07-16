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

  const lines: OrderLine[] = items.map((item) => ({
    productId: item.productId,
    productName: item.name,
    productSlug: item.productSlug,
    quantity: item.quantity,
    unitPriceCents: item.validatedPriceCents,
    billingType: item.billingType,
    totalCents: item.validatedPriceCents * item.quantity,
  }));

  const subtotalCents = sumLineItems(
    lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
  );
  const totals = calculateOrderTotals(subtotalCents);

  return {
    success: true,
    data: { lines, totals, customer },
  };
}
