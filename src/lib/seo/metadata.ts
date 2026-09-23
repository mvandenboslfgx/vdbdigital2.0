import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import {
  absoluteLocalizedUrl,
  buildLocaleAlternates,
  openGraphLocale,
} from "@/i18n/seo";
import { seoEnglishEquivalent } from "@/config/seo-routes";
import { siteConfig } from "@/config/site";

function resolveSeoEnEquivalent(seoPath: string): string {
  if (seoEnglishEquivalent[seoPath]) return seoEnglishEquivalent[seoPath];
  const segments = seoPath.split("/").filter(Boolean);
  if (segments.length > 1) {
    const parent = `/${segments.slice(0, -1).join("/")}`;
    return seoEnglishEquivalent[parent] ?? parent;
  }
  return seoPath;
}

/** Dutch SEO landing pages are canonical on bare NL paths; EN points to a real solution page. */
export function buildSeoLandingAlternates(seoPath: string, locale: Locale) {
  const enEquivalent = resolveSeoEnEquivalent(seoPath);
  const nlUrl = absoluteLocalizedUrl(seoPath, "nl");
  const enUrl = absoluteLocalizedUrl(enEquivalent, "en");
  return {
    canonical:
      locale === "nl" ? withLocale(seoPath, "nl") : withLocale(enEquivalent, "en"),
    languages: {
      nl: nlUrl,
      en: enUrl,
      "x-default": nlUrl,
    },
  };
}

export function createSeoLandingMetadata(
  title: string,
  description: string,
  seoPath: string,
  locale: Locale,
): Metadata {
  const pageTitle = title.replace(/\s*\|\s*VDB Digital(\s+Software)?\s*$/i, "").trim();
  const ogImage = siteConfig.brand.openGraphImage;

  return {
    title: pageTitle,
    description,
    alternates: buildSeoLandingAlternates(seoPath, locale),
    openGraph: {
      title: pageTitle,
      description,
      locale: openGraphLocale(locale),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
    },
  };
}

export function createMarketingMetadata(
  title: string,
  description: string,
  pathname: string,
  locale: Locale,
): Metadata {
  const pageTitle = title.replace(/\s*\|\s*VDB Digital(\s+Software)?\s*$/i, "").trim();
  return {
    title: pageTitle,
    description,
    alternates: buildLocaleAlternates(pathname, locale),
    openGraph: {
      title: pageTitle,
      description,
      locale: openGraphLocale(locale),
    },
  };
}
