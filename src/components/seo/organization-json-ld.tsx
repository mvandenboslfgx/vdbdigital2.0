import { siteConfig } from "@/config/site";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.brand.logo}`,
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    address: siteConfig.company.address
      ? {
          "@type": "PostalAddress",
          streetAddress: siteConfig.company.address,
          addressLocality: siteConfig.company.city || undefined,
          addressCountry: siteConfig.company.country,
        }
      : undefined,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: siteConfig.contactEmail,
        availableLanguage: ["English", "Dutch"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
