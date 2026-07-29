"use client";

/**
 * RevenuePromotionCard
 *
 * Herbruikbaar promotieblok voor eigen diensten, affiliate-aanbevelingen en
 * gesponsorde content. Transparant, design-conform, geen externe ad-JavaScript.
 *
 * Rules:
 *  - `type` determines mandatory disclosure strings.
 *  - Invalid / incomplete configuration → renders nothing (fail-closed).
 *  - External links get safe rel attributes.
 *  - No arbitrary HTML. No script injection. No AdSense slot.
 *  - Max 1 per page; max 2 in long knowledge articles (enforced by caller/policy).
 *  - Never above main content, never between form fields, never in portals/admin.
 */

import { ExternalLink, Tag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import type { PromotionType } from "@/config/promotion-policy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenuePromotionCardProps {
  /** Promotion category — determines mandatory disclosure. */
  type: PromotionType;
  /** Card headline. Required. */
  title: string;
  /** Card body text. Required. */
  description: string;
  /** CTA button label. Required. */
  ctaLabel: string;
  /** Destination URL. Must be a valid https URL. */
  destination: string;
  /** Optional accessible label for the icon/image area. */
  iconLabel?: string;
  /** AFFILIATE / SPONSORED: custom disclosure override. Falls back to default. */
  disclosure?: string;
  /** SPONSORED: sponsor name (shown in badge + disclosure). Required for SPONSORED. */
  sponsorName?: string;
  /** Locale — for future analytics event enrichment. */
  locale?: string;
  /** Placement identifier for policy tracking. */
  placementId?: string;
  /**
   * Master switch. When false, renders nothing.
   * Combine with feature flags at the call site.
   */
  enabled?: boolean;
  /** Extra class names on the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validates an https URL without executing it. */
function isValidHttpsUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Badge config per type. */
const BADGE_CONFIG: Record<
  PromotionType,
  { label: string | null; colorClass: string; icon: React.ReactNode }
> = {
  OWN_SERVICE: {
    label: null,
    colorClass: "",
    icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  AFFILIATE: {
    label: "Affiliate-link",
    colorClass: "bg-warning/10 text-warning border border-warning/20",
    icon: <Tag className="h-3 w-3" aria-hidden="true" />,
  },
  SPONSORED: {
    label: "Gesponsord",
    colorClass: "bg-secondary-soft text-secondary border border-secondary/20",
    icon: <Tag className="h-3 w-3" aria-hidden="true" />,
  },
};

function getDefaultDisclosure(
  type: PromotionType,
  sponsorName?: string,
): string {
  if (type === "AFFILIATE") {
    return "Dit is een affiliate-link. Wij ontvangen mogelijk een commissie als je via deze link koopt, zonder extra kosten voor jou.";
  }
  if (type === "SPONSORED") {
    return `Deze content is gesponsord door ${sponsorName ?? "een derde partij"}.`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenuePromotionCard({
  type,
  title,
  description,
  ctaLabel,
  destination,
  iconLabel,
  disclosure,
  sponsorName,
  enabled = true,
  className,
}: RevenuePromotionCardProps) {
  // Fail-closed guards
  if (!enabled) return null;
  if (!title || !description || !ctaLabel) return null;
  if (!isValidHttpsUrl(destination)) return null;
  // SPONSORED requires sponsorName
  if (type === "SPONSORED" && !sponsorName) return null;

  const badge = BADGE_CONFIG[type];
  const resolvedDisclosure =
    disclosure ?? getDefaultDisclosure(type, sponsorName);

  const linkRel =
    type === "OWN_SERVICE"
      ? "noopener noreferrer"
      : "sponsored nofollow noopener noreferrer";

  return (
    <aside
      aria-label={type !== "OWN_SERVICE" ? `${badge.label}: ${title}` : title}
      className={cn(
        "rounded-xl border border-border bg-surface-elevated p-4",
        "shadow-card",
        className,
      )}
    >
      {/* Badge — AFFILIATE / SPONSORED only */}
      {badge.label && (
        <div className="mb-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
              badge.colorClass,
            )}
          >
            {badge.icon}
            {badge.label}
            {type === "SPONSORED" && sponsorName && (
              <span className="font-normal normal-case tracking-normal">
                {" "}
                — {sponsorName}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Icon row for OWN_SERVICE */}
      {type === "OWN_SERVICE" && (
        <div
          className="mb-2 flex items-center gap-1.5 text-primary"
          aria-label={iconLabel}
        >
          {badge.icon}
          <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">
            VDB Digital
          </span>
        </div>
      )}

      <h3 className="text-sm font-semibold leading-snug text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>

      <a
        href={destination}
        target="_blank"
        rel={linkRel}
        className={cn(
          "mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3",
          "bg-primary text-primary-fg text-xs font-semibold",
          "hover:bg-primary-hover active:scale-95",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "transition-all duration-150",
        )}
      >
        {ctaLabel}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>

      {/* Disclosure — required for AFFILIATE + SPONSORED */}
      {resolvedDisclosure && type !== "OWN_SERVICE" && (
        <p className="mt-2.5 text-[0.65rem] leading-relaxed text-muted/70">
          {resolvedDisclosure}
        </p>
      )}
    </aside>
  );
}
