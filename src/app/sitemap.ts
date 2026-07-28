import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { withLocale } from "@/i18n/config";

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
  "/packages",
  "/shop",
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
