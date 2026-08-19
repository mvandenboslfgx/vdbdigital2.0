import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { withLocale } from "@/i18n/config";
import { getAllSeoSitemapPaths, seoEnglishEquivalent } from "@/config/seo-routes";

const staticRoutes = [
  "/",
  "/solutions",
  "/solutions/websites",
  "/solutions/webshops",
  "/solutions/ai-automation",
  "/solutions/whatsapp-ai",
  "/solutions/livechat",
  "/solutions/reviewflows",
  "/solutions/appointment-automation",
  "/solutions/website-maintenance",
  "/solutions/technical-support",
  "/solutions/conversion-optimisation",
  "/solutions/custom-software",
  "/shop",
  "/packages",
  "/cases",
  "/process",
  "/about",
  "/support",
  "/contact",
  "/quote",
  "/for-business",
  "/privacy",
  "/cookies",
  "/terms",
  "/refund-policy",
];

function bilingualEntries(
  path: string,
  opts: { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number },
): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const enPath = withLocale(path, "en");
  const nlPath = withLocale(path, "nl");
  const enUrl = `${base}${enPath === "/" ? "" : enPath}` || base;
  const nlUrl = `${base}${nlPath}`;

  return [
    {
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: {
        languages: {
          en: enUrl,
          nl: nlUrl,
          "x-default": enUrl,
        },
      },
    },
    {
      url: nlUrl,
      lastModified: new Date(),
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: {
        languages: {
          en: enUrl,
          nl: nlUrl,
          "x-default": enUrl,
        },
      },
    },
  ];
}

/** Dutch SEO landing pages — NL canonical only; EN alternate points to solution equivalent. */
function resolveSeoEnEquivalent(path: string): string {
  if (seoEnglishEquivalent[path]) return seoEnglishEquivalent[path];
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 1) {
    const parent = `/${segments.slice(0, -1).join("/")}`;
    return seoEnglishEquivalent[parent] ?? parent;
  }
  return path;
}

function nlSeoEntries(
  path: string,
  opts: { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number },
): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const nlPath = withLocale(path, "nl");
  const nlUrl = `${base}${nlPath}`;
  const enEquivalent = resolveSeoEnEquivalent(path);
  const enUrl = `${base}${enEquivalent === "/" ? "" : enEquivalent}` || base;

  return [
    {
      url: nlUrl,
      lastModified: new Date(),
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: {
        languages: {
          nl: nlUrl,
          en: enUrl,
          "x-default": enUrl,
        },
      },
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { getAllProducts } = await import("@/server/repositories/products");
  const products = await getAllProducts();

  const { getPublicCases, isCaseSearchIndexable } = await import(
    "@/config/commercial/cases"
  );

  const caseSlugs = [
    "conversie-website",
    "premium-webshop",
    "whatsapp-automatisering",
    "reviewflow-setup",
    ...getPublicCases()
      .filter((c) => isCaseSearchIndexable(c) || c.type === "demonstration")
      .map((c) => c.slug),
  ];
  // TrustBooker stays noindex → excluded via isCaseSearchIndexable (COMING_SOON).

  return [
    ...staticRoutes.flatMap((route) =>
      bilingualEntries(route, {
        changeFrequency: "weekly",
        priority: route === "/" ? 1 : 0.8,
      }),
    ),
    ...getAllSeoSitemapPaths().flatMap((route) =>
      nlSeoEntries(route, {
        changeFrequency: "monthly",
        priority: route.split("/").length > 2 ? 0.7 : 0.85,
      }),
    ),
    ...caseSlugs.flatMap((slug) =>
      bilingualEntries(`/cases/${slug}`, {
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
    ...products.flatMap((p) =>
      bilingualEntries(`/shop/${p.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
  ];
}
