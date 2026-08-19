import { cn } from "@/lib/utilities/cn";
import { LocaleLink } from "@/i18n/locale-link";
import {
  CATALOG_PILLAR_ORDER,
  catalogPillars,
  type CatalogPillar,
} from "@/config/catalog";

interface PillarNavProps {
  activePillar: CatalogPillar;
  labels: Record<Lowercase<CatalogPillar>, string>;
  className?: string;
}

export function PillarNav({ activePillar, labels, className }: PillarNavProps) {
  return (
    <nav
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Product pillars"
    >
      {CATALOG_PILLAR_ORDER.map((pillarId) => {
        const pillar = catalogPillars.find((p) => p.id === pillarId)!;
        const isActive = activePillar === pillarId;
        return (
          <LocaleLink
            key={pillar.id}
            href={pillar.shopHref}
            className={cn(
              "shrink-0 px-4 py-2.5 rounded-lg text-small border transition-colors min-h-10 inline-flex items-center",
              isActive
                ? "bg-primary text-white border-primary"
                : "border-light-border text-light-muted hover:border-primary hover:text-primary",
              pillar.secondary && !isActive && "opacity-90",
            )}
          >
            {labels[pillar.i18nKey]}
          </LocaleLink>
        );
      })}
    </nav>
  );
}
