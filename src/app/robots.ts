import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { isPreviewDeployment } from "@/lib/url/app-url";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  // Auth/portal flows are never indexable in either locale (English bare path, Dutch under `/nl`).
  const nonIndexablePrefixes = [
    "/admin/",
    "/api/",
    "/checkout/",
    "/portal/",
    "/inloggen",
    "/uitloggen",
    "/auth/",
    "/wachtwoord",
    "/account-",
    "/uitnodiging",
    "/e-mail-bevestigen",
    "/geen-toegang",
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...nonIndexablePrefixes,
        ...nonIndexablePrefixes.map((prefix) => `/nl${prefix}`),
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
