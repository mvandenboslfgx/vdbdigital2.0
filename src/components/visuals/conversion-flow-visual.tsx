import { ArrowRight, MousePointerClick } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface ConversionFlowVisualProps {
  className?: string;
}

/** Illustrative conversion path — no fake conversion rates */
export function ConversionFlowVisual({ className }: ConversionFlowVisualProps) {
  const steps = ["Visitor lands", "Clear offer", "Call to action", "New enquiry"];

  return (
    <VisualFrame title="Conversion path" className={className}>
      <div className="space-y-2 motion-safe:animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <MousePointerClick className="h-3.5 w-3.5 text-primary" aria-hidden />
          Enquiry flow
        </div>
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs">
              {step}
            </div>
            {i < steps.length - 1 ? (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted motion-reduce:hidden" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </VisualFrame>
  );
}
