import { Card } from "@/components/ui/container";
import { LocaleLink } from "@/i18n/locale-link";
import { paths } from "@/i18n/config";
import type { SoftwarePublicDto } from "@/config/software-catalog";

interface SoftwareCatalogGridProps {
  items: SoftwarePublicDto[];
  requestLabel: string;
  onRequestLabel: string;
}

export function SoftwareCatalogGrid({
  items,
  requestLabel,
  onRequestLabel,
}: SoftwareCatalogGridProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <LocaleLink key={item.id} href={`${paths.shopSoftware}/${item.slug}`}>
          <Card
            variant="light"
            className="h-full hover:border-primary/40 transition-colors group flex flex-col"
          >
            <p className="text-label text-light-muted mb-2">{item.brand}</p>
            <h3 className="text-h3 text-light-foreground mb-2 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            <p className="text-small text-light-muted mb-4 flex-1 line-clamp-3">
              {item.shortDescription}
            </p>
            <p className="text-sm font-medium text-primary">
              {item.priceLabel === "verified" && item.publicPriceEur != null
                ? `€${item.publicPriceEur.toFixed(2)}`
                : onRequestLabel}
            </p>
          </Card>
        </LocaleLink>
      ))}
      <Card variant="light" className="h-full flex flex-col justify-center border-dashed">
        <h3 className="text-h3 text-light-foreground mb-2">{requestLabel}</h3>
        <LocaleLink
          href={`${paths.quote}?intent=software-license`}
          className="text-primary font-medium hover:underline text-small"
        >
          {requestLabel} →
        </LocaleLink>
      </Card>
    </div>
  );
}
