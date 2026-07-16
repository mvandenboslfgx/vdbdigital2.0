import { defaultLocale, withLocale, type Locale } from "@/i18n/config";
import { siteConfig } from "@/config/site";

/** Absolute URL for a pathname in a given locale (English has no `/en` prefix). */
export function absoluteLocalizedUrl(pathname: string, locale: Locale): string {
  const path = withLocale(pathname, locale);
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}${path === "/" ? "" : path}` || base;
}

/**
 * Canonical + hreflang alternates for an indexable marketing page.
 * English canonical never uses `/en`. Dutch uses `/nl…`. x-default → English.
 */
export function buildLocaleAlternates(pathname: string, locale: Locale) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return {
    canonical: withLocale(normalized, locale),
    languages: {
      en: withLocale(normalized, "en"),
      nl: withLocale(normalized, "nl"),
      "x-default": withLocale(normalized, defaultLocale),
    },
  };
}

export function openGraphLocale(locale: Locale): string {
  return locale === "nl" ? "nl_NL" : "en_GB";
}
