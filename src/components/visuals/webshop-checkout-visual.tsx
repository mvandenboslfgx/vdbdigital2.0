import { CreditCard, Package, ShoppingCart } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface WebshopCheckoutVisualProps {
  className?: string;
}

/** Illustrative checkout states — no fake revenue */
export function WebshopCheckoutVisual({ className }: WebshopCheckoutVisualProps) {
  const steps = [
    { icon: ShoppingCart, label: "Order received" },
    { icon: CreditCard, label: "Payment pending" },
    { icon: Package, label: "Ready for fulfilment" },
  ];

  return (
    <VisualFrame title="Checkout flow" className={className}>
      <ol className="space-y-2 motion-safe:animate-fade-in">
        {steps.map(({ icon: Icon, label }, i) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span>
              <span className="text-muted">{i + 1}. </span>
              {label}
            </span>
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}
