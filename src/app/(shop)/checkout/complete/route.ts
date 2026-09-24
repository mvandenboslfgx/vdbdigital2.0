import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearCart } from "@/features/cart/cart-service";
import { resolveAppUrl } from "@/lib/url/app-url";

export async function GET(request: NextRequest) {
  const order = request.nextUrl.searchParams.get("order");
  await clearCart();

  const url = new URL("/checkout/success", resolveAppUrl());
  if (order) url.searchParams.set("order", order);
  return NextResponse.redirect(url);
}
