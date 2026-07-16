"use server";

import { revalidatePath } from "next/cache";
import {
  addToCart,
  removeFromCart,
  updateCartQuantity,
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
