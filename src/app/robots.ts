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
    // Public commercial content stays crawlable for Google, Bing and AI search crawlers.
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
