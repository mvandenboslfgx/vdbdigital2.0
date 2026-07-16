import { VisualFrame } from "@/components/visuals/visual-frame";

interface AutomationFlowVisualProps {
  title: string;
  steps: string[];
  className?: string;
}

export function AutomationFlowVisual({ title, steps, className }: AutomationFlowVisualProps) {
  return (
    <VisualFrame title={title} className={className}>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li
            key={step}
            className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
            {step}
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}
