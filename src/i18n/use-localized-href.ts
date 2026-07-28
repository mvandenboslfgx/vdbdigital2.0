"use client";

import { useLocale } from "@/i18n/locale-provider";
import { withLocale } from "@/i18n/config";

/** Returns a function that localises any absolute path for the active locale. */
export function useLocalizedHref() {
  const locale = useLocale();
  return (href: string) => withLocale(href, locale);
}
