"use client";

import { useLocale as useNextIntlLocale } from "next-intl";
import { withLocale, isLocale, type Locale } from "@/i18n/config";

function asLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

/** Returns a function that localises any absolute path for the active locale. */
export function useLocalizedHref() {
  const locale = asLocale(useNextIntlLocale());
  return (href: string) => withLocale(href, locale);
}
