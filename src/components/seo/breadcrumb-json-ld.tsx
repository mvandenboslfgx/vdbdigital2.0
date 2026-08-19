import { absoluteLocalizedUrl } from "@/i18n/seo";
import type { Locale } from "@/i18n/config";

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
  locale: Locale;
}

export function BreadcrumbJsonLd({ items, locale }: BreadcrumbJsonLdProps) {
  if (!items.length) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteLocalizedUrl(item.path, locale),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
