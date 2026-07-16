import "server-only";
import { cookies } from "next/headers";
import type { Cart, CartItem, Product } from "@/types";
import { getProductForCheckout } from "@/server/repositories/products";
import { isDirectCheckoutEnabled } from "@/config/features";
import {
  assertCheckoutAllowedForCustomer,
  resolvePriceMode,
} from "@/lib/commerce/checkout-eligibility";
import type { CheckoutCustomerType } from "@/lib/commerce/checkout-eligibility";

const CART_COOKIE = "vdb_cart";
const MAX_QUANTITY = 99;

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
  if (quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error("Invalid quantity");
  }

  const product = await getProductForCheckout(productSlug);
  if (!product) {
    throw new Error("Product cannot be added to cart");
  }
  if (resolvePriceMode(product) !== "FIXED" || product.priceCents === null) {
    throw new Error("Product has no fixed checkout price");
  }

  const cart = await getCart();
  const priceCents = product.priceCents;
  const existing = cart.items.find((i) => i.productId === product.id);

  if (existing) {
    existing.quantity += quantity;
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
  if (quantity > MAX_QUANTITY) {
    throw new Error("Maximum quantity exceeded");
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
  items: Array<CartItem & { validatedPriceCents: number }>;
  errors: string[];
}> {
  const errors: string[] = [];
  const items: Array<CartItem & { validatedPriceCents: number }> = [];

  if (!isDirectCheckoutEnabled()) {
    return {
      items: [],
      errors: ["Direct checkout is temporarily disabled"],
    };
  }

  for (const item of cart.items) {
    if (item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      errors.push(`Invalid quantity for ${item.name}`);
      continue;
    }

    const product = await getProductForCheckout(item.productSlug);
    if (!product) {
      errors.push(`${item.name} is no longer available for checkout`);
      continue;
    }

    if (customerType) {
      const gateError = assertCheckoutAllowedForCustomer(product, customerType);
      if (gateError) {
        errors.push(gateError);
        continue;
      }
    }

    if (resolvePriceMode(product) !== "FIXED" || product.priceCents === null) {
      errors.push(`${item.name} requires a quote (starting-from or non-fixed price)`);
      continue;
    }

    items.push({
      ...item,
      validatedPriceCents: product.priceCents,
      priceCents: product.priceCents,
      quantity: item.quantity,
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
