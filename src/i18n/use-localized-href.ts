"use client";

import { useI18n } from "@/i18n/provider";
import { withLocale } from "@/i18n/config";

/** Returns a function that localises any absolute path for the active locale. */
export function useLocalizedHref() {
  const { locale } = useI18n();
  return (href: string) => withLocale(href, locale);
}
