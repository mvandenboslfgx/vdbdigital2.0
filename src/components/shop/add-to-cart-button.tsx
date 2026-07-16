"use client";

import { useTransition } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/server/actions/cart-actions";
import { useT } from "@/i18n/provider";

export function AddToCartButton({ productSlug }: { productSlug: string }) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(() => addToCartAction(productSlug))}
    >
      <ShoppingCart className="h-4 w-4" />
      {pending ? t("shop.adding") : t("shop.addToCart")}
    </Button>
  );
}
