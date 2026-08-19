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

/**
 * Hreflang for Dutch SEO landing pages: NL canonical on /nl/…, EN on solution equivalent.
 */
export function buildSeoLandingAlternates(seoPath: string, locale: Locale) {
  const enEquivalent = seoEnglishEquivalent[seoPath] ?? seoPath;
  return {
    canonical: withLocale(seoPath, locale),
    languages: {
      nl: absoluteLocalizedUrl(seoPath, "nl"),
      en: absoluteLocalizedUrl(enEquivalent, "en"),
      "x-default": absoluteLocalizedUrl(enEquivalent, "en"),
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
