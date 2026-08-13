"use client";

import { useLocale as useNextIntlLocale } from "next-intl";
import { isLocale, type Locale } from "@/i18n/config";

/**
 * Compatibility hook. Prefer `useLocale` from `next-intl` in new code.
 * Requires `NextIntlClientProvider` (mounted in root layout).
 */
export function useLocale(): Locale {
  const value = useNextIntlLocale();
  return isLocale(value) ? value : "en";
}
