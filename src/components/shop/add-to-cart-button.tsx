"use client";

import { useTransition } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/server/actions/cart-actions";
import { useT } from "@/i18n/provider";

export function AddToCartButton({
  productSlug,
  quantity,
  minQuantity,
  maxQuantity,
}: {
  productSlug: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
}) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <Button
      className="w-full"
      disabled={pending || quantity < minQuantity || quantity > maxQuantity}
      onClick={() => startTransition(() => addToCartAction(productSlug, quantity))}
    >
      <ShoppingCart className="h-4 w-4" />
      {pending ? t("shop.adding") : t("shop.addToCart")}
    </Button>
  );
}
