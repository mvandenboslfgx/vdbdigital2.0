import { Quote } from "lucide-react";
import { cn } from "@/lib/utilities/cn";

export interface CaseTestimonialContent {
  quote: string;
  authorName: string;
  authorRole: string;
}

/**
 * Client quote block for a case card/section. Only render this when the
 * corresponding CaseDefinition.permissions.testimonialPermission is true —
 * see src/config/commercial/cases.ts. No testimonial should ever be shown
 * for a case that hasn't given explicit permission.
 */
export function CaseTestimonial({
  quote,
  authorName,
  authorRole,
  tone = "light",
  className,
}: CaseTestimonialContent & {
  tone?: "light" | "dark";
  className?: string;
}) {
  const isLight = tone === "light";

  return (
    <figure
      className={cn(
        "relative rounded-lg border px-4 py-3.5",
        isLight
          ? "border-border/60 bg-surface-elevated/60"
          : "border-border/70 bg-surface-elevated/40",
        className,
      )}
    >
      <Quote
        className={cn(
          "absolute -top-2.5 left-3 h-5 w-5 rotate-180",
          isLight ? "text-primary/70" : "text-primary/80",
        )}
        aria-hidden="true"
      />
      <blockquote
        className={cn(
          "text-small italic",
          isLight ? "text-light-foreground" : "text-foreground",
        )}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption
        className={cn(
          "mt-2 text-xs",
          isLight ? "text-light-muted" : "text-muted",
        )}
      >
        <span className="font-medium">{authorName}</span>
        {authorRole ? <span> — {authorRole}</span> : null}
      </figcaption>
    </figure>
  );
}
