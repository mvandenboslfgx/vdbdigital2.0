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
  "/account-deletion",
];

function absolute(path: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}${path === "/" ? "" : path}` || base;
}

function bilingualEntries(
  path: string,
  opts: {
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  },
): MetadataRoute.Sitemap {
  const nlUrl = absolute(withLocale(path, "nl"));
  const enUrl = absolute(withLocale(path, "en"));
  const alternates = {
    languages: {
      nl: nlUrl,
      en: enUrl,
      "x-default": nlUrl,
    },
  };

  return [
    {
      url: nlUrl,
      lastModified: new Date(),
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates,
    },
    {
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: opts.changeFrequency,
      priority: Math.max(0.1, opts.priority - 0.05),
      alternates,
    },
  ];
}

function resolveSeoEnEquivalent(path: string): string {
  if (seoEnglishEquivalent[path]) return seoEnglishEquivalent[path];
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 1) {
    const parent = `/${segments.slice(0, -1).join("/")}`;
    return seoEnglishEquivalent[parent] ?? parent;
  }
  return path;
}

/** Dutch keyword pages are canonical NL; English alternate points to the closest real EN page. */
function nlSeoEntries(
  path: string,
  opts: {
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  },
): MetadataRoute.Sitemap {
  const nlUrl = absolute(withLocale(path, "nl"));
  const enEquivalent = resolveSeoEnEquivalent(path);
  const enUrl = absolute(withLocale(enEquivalent, "en"));

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
          "x-default": nlUrl,
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
        priority: route.split("/").length > 2 ? 0.75 : 0.9,
      }),
    ),
    ...caseSlugs.flatMap((slug) =>
      bilingualEntries(`/cases/${slug}`, {
        changeFrequency: "monthly",
        priority: 0.7,
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
