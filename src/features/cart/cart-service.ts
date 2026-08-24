import "server-only";
import { cookies } from "next/headers";
import type { Cart, CartItem, Product } from "@/types";
import { getProductForCheckout } from "@/server/repositories/products";
import { isDirectCheckoutEnabled } from "@/config/features";
import {
  assertCheckoutAllowedForCustomer,
  resolvePriceMode,
} from "@/lib/commerce/checkout-eligibility";
import { resolveCustomerUnitPriceCents } from "@/lib/commerce/canonical-pricing";
import type { CheckoutCustomerType } from "@/lib/commerce/checkout-eligibility";

const CART_COOKIE = "vdb_cart";
const ABSOLUTE_MAX_QUANTITY = 999;

function parseCart(raw: string | undefined): Cart {
  if (!raw) {
    return { items: [], updatedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(raw) as Cart;
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

async function saveCart(cart: Cart) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCart(): Promise<Cart> {
  const cookieStore = await cookies();
  return parseCart(cookieStore.get(CART_COOKIE)?.value);
}

export async function addToCart(productSlug: string, quantity = 1): Promise<Cart> {
  if (!isDirectCheckoutEnabled()) {
    throw new Error("Direct checkout is temporarily disabled");
  }
  if (quantity < 1 || quantity > ABSOLUTE_MAX_QUANTITY) {
    throw new Error("Invalid quantity");
  }

  const product = await getProductForCheckout(productSlug);
  if (!product) {
    throw new Error("Product cannot be added to cart");
  }
  const minQuantity = product.minQuantity ?? 1;
  const maxQuantity = product.maxQuantity ?? 99;
  if (quantity < minQuantity || quantity > maxQuantity) {
    throw new Error("Quantity is outside the allowed range for this product");
  }
  if (resolvePriceMode(product) !== "FIXED" || product.priceCents === null) {
    throw new Error("Product has no fixed checkout price");
  }

  const cart = await getCart();
  const priceCents = product.priceCents;
  const existing = cart.items.find((i) => i.productId === product.id);

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    if (nextQuantity > maxQuantity) {
      throw new Error("Maximum quantity exceeded");
    }
    existing.quantity = nextQuantity;
  } else {
    const item: CartItem = {
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      priceCents,
      billingType: product.billingType,
      quantity,
    };
    cart.items.push(item);
  }

  cart.updatedAt = new Date().toISOString();
  await saveCart(cart);
  return cart;
}

export async function removeFromCart(productId: string): Promise<Cart> {
  const cart = await getCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  cart.updatedAt = new Date().toISOString();
  await saveCart(cart);
  return cart;
}

export async function updateCartQuantity(
  productId: string,
  quantity: number,
): Promise<Cart> {
  const cart = await getCart();
  const item = cart.items.find((i) => i.productId === productId);
  if (!item) return cart;

  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  if (quantity > ABSOLUTE_MAX_QUANTITY) {
    throw new Error("Maximum quantity exceeded");
  }

  const product = await getProductForCheckout(item.productSlug);
  if (
    !product ||
    quantity < (product.minQuantity ?? 1) ||
    quantity > (product.maxQuantity ?? 99)
  ) {
    throw new Error("Quantity is outside the allowed range for this product");
  }

  item.quantity = quantity;
  cart.updatedAt = new Date().toISOString();
  await saveCart(cart);
  return cart;
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
}

/** Herbereken prijzen server-side — vertrouw nooit op opgeslagen bedragen */
export async function validateCartItems(
  cart: Cart,
  customerType?: CheckoutCustomerType,
): Promise<{
  items: Array<CartItem & { validatedPriceCents: number; validatedProduct: Product }>;
  errors: string[];
}> {
  const errors: string[] = [];
  const items: Array<
    CartItem & { validatedPriceCents: number; validatedProduct: Product }
  > = [];

  if (!isDirectCheckoutEnabled()) {
    return {
      items: [],
      errors: ["Direct checkout is temporarily disabled"],
    };
  }

  for (const item of cart.items) {
    if (item.quantity < 1 || item.quantity > ABSOLUTE_MAX_QUANTITY) {
      errors.push(`Invalid quantity for ${item.name}`);
      continue;
    }

    const product = await getProductForCheckout(item.productSlug);
    if (!product) {
      errors.push(`${item.name} is no longer available for checkout`);
      continue;
    }
    if (
      item.quantity < (product.minQuantity ?? 1) ||
      item.quantity > (product.maxQuantity ?? 99)
    ) {
      errors.push(`${item.name} has an invalid licence quantity`);
      continue;
    }

    if (customerType) {
      const gateError = assertCheckoutAllowedForCustomer(product, customerType);
      if (gateError) {
        errors.push(gateError);
        continue;
      }
    }

    if (resolvePriceMode(product) !== "FIXED") {
      errors.push(`${item.name} requires a quote (starting-from or non-fixed price)`);
      continue;
    }

    const unitPriceCents = resolveCustomerUnitPriceCents({
      priceMode: product.priceMode,
      retailPriceCents: product.retailPriceCents ?? product.priceCents,
      salePriceCents: product.salePriceCents,
      saleStartsAt: product.saleStartsAt,
      saleEndsAt: product.saleEndsAt,
    });
    if (unitPriceCents == null || unitPriceCents <= 0) {
      errors.push(`${item.name} requires a quote (starting-from or non-fixed price)`);
      continue;
    }

    items.push({
      ...item,
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      billingType: product.billingType,
      validatedPriceCents: unitPriceCents,
      priceCents: unitPriceCents,
      quantity: item.quantity,
      validatedProduct: product,
    });
  }

  return { items, errors };
}

export async function resolveCartProducts(cart: Cart): Promise<
  Array<CartItem & { product: Product | null }>
> {
  return Promise.all(
    cart.items.map(async (item) => ({
      ...item,
      product: await getProductForCheckout(item.productSlug),
    })),
  );
}
