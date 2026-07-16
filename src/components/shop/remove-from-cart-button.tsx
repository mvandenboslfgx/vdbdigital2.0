"use client";

import { useTransition } from "react";
import { removeFromCartAction } from "@/server/actions/cart-actions";
import { useT } from "@/i18n/provider";

export function RemoveFromCartButton({ productId }: { productId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeFromCartAction(productId))}
      className="text-small text-danger hover:underline mt-2"
    >
      {t("cart.remove")}
    </button>
  );
}
