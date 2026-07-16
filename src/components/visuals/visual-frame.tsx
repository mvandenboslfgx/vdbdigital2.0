import { cn } from "@/lib/utilities/cn";

interface VisualFrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

/** Reusable product proof frame — no fake metrics */
export function VisualFrame({ title, subtitle, children, className }: VisualFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface-elevated",
        className,
      )}
      aria-hidden={subtitle ? undefined : true}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex gap-1.5 shrink-0" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-danger/50" />
          <span className="h-2 w-2 rounded-full bg-warning/50" />
          <span className="h-2 w-2 rounded-full bg-success/50" />
        </div>
        <p className="truncate text-xs font-medium text-muted">{title}</p>
      </div>
      {subtitle ? (
        <p className="px-3 pt-2 text-xs text-muted">{subtitle}</p>
      ) : null}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}
