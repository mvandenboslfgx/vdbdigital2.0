import { siteConfig, hasSocial } from "@/config/site";

export function OrganizationJsonLd() {
  const sameAs = (["linkedin", "instagram"] as const)
    .filter((network) => hasSocial(network))
    .map((network) => siteConfig.social[network]);

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: "VDB Digital",
    legalName: siteConfig.legalName,
    identifier: siteConfig.company.kvk
      ? {
          "@type": "PropertyValue",
          propertyID: "KvK",
          value: siteConfig.company.kvk,
        }
      : undefined,
    vatID: siteConfig.company.vat || undefined,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.brand.logo}`,
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    telephone: siteConfig.company.phoneTel,
    areaServed: {
      "@type": "Country",
      name: "Netherlands",
    },
    knowsAbout: [
      "Webdesign",
      "Website development",
      "E-commerce",
      "AI automation",
      "WhatsApp automation",
      "CRM systems",
      "Customer portals",
      "Custom software",
    ],
    address: siteConfig.company.address
      ? {
          "@type": "PostalAddress",
          streetAddress: siteConfig.company.address,
          postalCode: siteConfig.company.postalCode || undefined,
          addressLocality: siteConfig.company.city || undefined,
          addressRegion: "South Holland",
          addressCountry: siteConfig.company.country,
        }
      : undefined,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales and customer service",
        email: siteConfig.contactEmail,
        telephone: siteConfig.company.phoneTel,
        availableLanguage: ["Dutch", "English", "nl", "en"],
      },
    ],
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
