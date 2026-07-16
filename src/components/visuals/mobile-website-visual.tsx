import { Smartphone } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface MobileWebsiteVisualProps {
  className?: string;
}

/** Illustrative mobile layout — no fake device metrics */
export function MobileWebsiteVisual({ className }: MobileWebsiteVisualProps) {
  return (
    <VisualFrame title="Mobile layout" className={className}>
      <div className="mx-auto max-w-[11rem] motion-safe:animate-fade-in">
        <div className="rounded-[1.25rem] border border-border bg-background p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] text-muted">
            <Smartphone className="h-3 w-3" aria-hidden />
            Phone viewport
          </div>
          <div className="space-y-2 rounded-xl border border-border p-2">
            <div className="h-4 rounded bg-primary/20" />
            <div className="h-16 rounded-md bg-surface-elevated border border-border" />
            <div className="h-7 rounded-md bg-primary/30" />
            <div className="space-y-1">
              <div className="h-2 rounded bg-muted/30" />
              <div className="h-2 w-4/5 rounded bg-muted/20" />
            </div>
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}
