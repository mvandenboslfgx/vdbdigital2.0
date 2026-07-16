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

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/checkout/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
