import { MessageSquareHeart, Send, Star } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface ReviewFlowVisualProps {
  className?: string;
}

/** Illustrative review follow-up — no fake ratings */
export function ReviewFlowVisual({ className }: ReviewFlowVisualProps) {
  const steps = [
    { icon: Send, label: "Service completed" },
    { icon: MessageSquareHeart, label: "Review invitation scheduled" },
    { icon: Star, label: "Feedback captured" },
  ];

  return (
    <VisualFrame title="Review flow" className={className}>
      <ol className="space-y-2 motion-safe:animate-fade-in">
        {steps.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
            {label}
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}
