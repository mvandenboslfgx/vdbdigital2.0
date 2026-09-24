import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { isPreviewDeployment } from "@/lib/url/app-url";

const privatePaths = [
  "/admin/",
  "/portal/",
  "/api/",
  "/auth/",
  "/checkout/",
  "/inloggen",
  "/account-aanmaken",
  "/wachtwoord-vergeten",
  "/wachtwoord-herstellen",
  "/geen-toegang",
];

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    // Public commercial content stays crawlable for Google, Bing and AI answer engines.
    // Keep explicit AI directives in addition to the wildcard rule so provider
    // intent is unambiguous while private/authenticated surfaces remain blocked.
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
