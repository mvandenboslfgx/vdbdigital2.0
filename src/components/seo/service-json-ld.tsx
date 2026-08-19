import { siteConfig } from "@/config/site";
import { absoluteLocalizedUrl } from "@/i18n/seo";
import type { Locale } from "@/i18n/config";

interface ServiceJsonLdProps {
  name: string;
  description: string;
  path: string;
  locale: Locale;
}

export function ServiceJsonLd({ name, description, path, locale }: ServiceJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteLocalizedUrl(path, locale),
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: {
      "@type": "Country",
      name: "Netherlands",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
