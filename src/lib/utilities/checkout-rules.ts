import type { OrderLine } from "@/types";

export function canCheckoutTogether(items: OrderLine[]): boolean {
  const hasQuote = items.some((i) => i.billingType === "QUOTE_ONLY");
  const hasPaid = items.some(
    (i) => i.billingType !== "QUOTE_ONLY" && i.billingType !== "FREE",
  );
  return !(hasQuote && hasPaid);
}
