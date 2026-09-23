import { siteConfig } from "@/config/site";

/** Stable site/entity graph for search engines and answer engines. */
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    alternateName: "VDB Digital",
    inLanguage: ["nl-NL", "en-GB"],
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
