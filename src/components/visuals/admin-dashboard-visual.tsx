import { Inbox, LayoutDashboard, ListChecks } from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";

interface AdminDashboardVisualProps {
  className?: string;
}

/** Illustrative admin layout — no fake KPIs or revenue */
export function AdminDashboardVisual({ className }: AdminDashboardVisualProps) {
  return (
    <VisualFrame title="Admin overview" className={className}>
      <div className="space-y-3 motion-safe:animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-muted">
          <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden />
          Workspace
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
              <Inbox className="h-3.5 w-3.5 text-muted" aria-hidden />
              Inbox
            </div>
            <p className="text-xs text-muted">New enquiry</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
              <ListChecks className="h-3.5 w-3.5 text-muted" aria-hidden />
              Tasks
            </div>
            <p className="text-xs text-muted">Payment pending</p>
          </div>
        </div>
        <div className="h-10 rounded-md border border-dashed border-border bg-background" />
      </div>
    </VisualFrame>
  );
}
