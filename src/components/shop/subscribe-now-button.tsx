"use client";

import { useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSubscriptionCheckoutAction } from "@/server/actions/cart-actions";
import { useT } from "@/i18n/provider";

export function SubscribeNowButton({
  productSlug,
}: {
  productSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(() => startSubscriptionCheckoutAction(productSlug))
      }
    >
      <CreditCard className="h-4 w-4" />
      {pending ? t("shop.startingSubscription") : t("shop.subscribeNow")}
    </Button>
  );
}
