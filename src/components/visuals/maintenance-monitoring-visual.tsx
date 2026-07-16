import { Activity, ShieldCheck, Wrench } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface MaintenanceMonitoringVisualProps {
  className?: string;
}

/** Illustrative care / monitoring states — no fake uptime percentages */
export function MaintenanceMonitoringVisual({
  className,
}: MaintenanceMonitoringVisualProps) {
  const items = [
    { icon: Activity, label: "Health check queued" },
    { icon: ShieldCheck, label: "Updates reviewed" },
    { icon: Wrench, label: "Change window planned" },
  ];

  return (
    <VisualFrame title="Maintenance & monitoring" className={className}>
      <ul className="space-y-2 motion-safe:animate-fade-in">
        {items.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </VisualFrame>
  );
}
