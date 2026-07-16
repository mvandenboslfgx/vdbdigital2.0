import type { Product } from "@/types";
import { canAddToDirectCheckout } from "@/lib/commerce/checkout-eligibility";

/** UI helper: show add-to-cart only when direct checkout is allowed */
export function productAllowsAddToCart(product: Product): boolean {
  return canAddToDirectCheckout(product);
}
