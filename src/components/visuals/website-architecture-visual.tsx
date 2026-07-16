import { Network } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface WebsiteArchitectureVisualProps {
  className?: string;
}

/** Illustrative site structure — no fake metrics */
export function WebsiteArchitectureVisual({ className }: WebsiteArchitectureVisualProps) {
  return (
    <VisualFrame title="Website structure" className={className}>
      <div className="space-y-3 motion-safe:animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Network className="h-3.5 w-3.5 text-primary" aria-hidden />
          Page hierarchy
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium">
          Home
        </div>
        <div className="ml-4 grid gap-2 border-l border-dashed border-border pl-3">
          {["Services", "About", "Contact"].map((label) => (
            <div
              key={label}
              className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </VisualFrame>
  );
}
