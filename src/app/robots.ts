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
  // NOTE: no trailing slash on /admin, /checkout, /cart, /portal — each of
  // those also has a bare index route (e.g. `/admin` itself, from the
  // `(protected)` route group), and a trailing-slash-only prefix like
  // `/admin/` does NOT match the bare `/admin` path in robots.txt prefix
  // matching. The bare index pages already carry their own `robots: {
  // index: false }` metadata (defense in depth), but robots.txt should
  // block them directly too.
  const nonIndexablePrefixes = [
    "/admin",
    "/api/",
    "/checkout",
    "/cart",
    "/portal",
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
