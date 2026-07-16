"use client";

import { useTransition } from "react";
import { updateQuantityAction } from "@/server/actions/cart-actions";
import { cn } from "@/lib/utilities/cn";
import { useT } from "@/i18n/provider";

interface CartQuantityControlsProps {
  productId: string;
  quantity: number;
}

export function CartQuantityControls({
  productId,
  quantity,
}: CartQuantityControlsProps) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  function change(next: number) {
    startTransition(async () => {
      await updateQuantityAction(productId, next);
    });
  }

  return (
    <div className="inline-flex items-center gap-1 mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => change(quantity - 1)}
        className={cn(
          "h-10 w-10 rounded-md border border-border text-base hover:bg-surface-elevated",
          pending && "opacity-50",
        )}
        aria-label={t("cart.decrease")}
      >
        −
      </button>
      <span className="min-w-10 text-center text-small font-medium" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        disabled={pending || quantity >= 99}
        onClick={() => change(quantity + 1)}
        className={cn(
          "h-10 w-10 rounded-md border border-border text-base hover:bg-surface-elevated",
          pending && "opacity-50",
        )}
        aria-label={t("cart.increase")}
      >
        +
      </button>
    </div>
  );
}
