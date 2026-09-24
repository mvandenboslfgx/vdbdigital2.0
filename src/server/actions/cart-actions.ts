"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
} from "@/features/cart/cart-service";

export async function addToCartAction(productSlug: string) {
  await addToCart(productSlug);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/shop");
}

export async function removeFromCartAction(productId: string) {
  await removeFromCart(productId);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}

export async function updateQuantityAction(productId: string, quantity: number) {
  await updateCartQuantity(productId, quantity);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}

export async function startSubscriptionCheckoutAction(productSlug: string) {
  await clearCart();
  await addToCart(productSlug, 1);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/shop");
  redirect("/checkout");
}
