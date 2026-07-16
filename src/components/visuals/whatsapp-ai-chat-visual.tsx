import { VisualFrame } from "@/components/visuals/visual-frame";

interface FlowStep {
  label: string;
}

interface WhatsAppAiChatVisualProps {
  title: string;
  steps: FlowStep[];
  className?: string;
}

export function WhatsAppAiChatVisual({ title, steps, className }: WhatsAppAiChatVisualProps) {
  return (
    <VisualFrame title={title} className={className}>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-medium">
              {i + 1}
            </span>
            <span className="text-foreground">{step.label}</span>
          </div>
        ))}
      </div>
    </VisualFrame>
  );
}
