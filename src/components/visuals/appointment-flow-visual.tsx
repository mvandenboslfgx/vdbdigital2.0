import { CalendarCheck, Clock3, MapPin } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface AppointmentFlowVisualProps {
  className?: string;
}

/** Illustrative booking states — no fake availability counts */
export function AppointmentFlowVisual({ className }: AppointmentFlowVisualProps) {
  const steps = [
    { icon: Clock3, label: "Slot requested" },
    { icon: MapPin, label: "Online or on-site" },
    { icon: CalendarCheck, label: "Introduction confirmed" },
  ];

  return (
    <VisualFrame title="Appointment flow" className={className}>
      <ol className="space-y-2 motion-safe:animate-fade-in">
        {steps.map(({ icon: Icon, label }, i) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-medium text-primary">
              {i + 1}
            </span>
            <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
            {label}
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}
