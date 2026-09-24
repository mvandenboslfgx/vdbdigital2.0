import type { OrderLine } from "@/types";

function isRecurring(line: OrderLine): boolean {
  return line.billingType === "MONTHLY" || line.billingType === "YEARLY";
}

export function canCheckoutTogether(items: OrderLine[]): boolean {
  const hasQuote = items.some((i) => i.billingType === "QUOTE_ONLY");
  const hasPaid = items.some(
    (i) => i.billingType !== "QUOTE_ONLY" && i.billingType !== "FREE",
  );
  if (hasQuote && hasPaid) return false;

  const recurring = items.filter(isRecurring);
  if (recurring.length > 0) {
    // Keep recurring setup deterministic: one subscription product, quantity 1.
    return items.length === 1 && recurring.length === 1 && recurring[0].quantity === 1;
  }

  return true;
}
