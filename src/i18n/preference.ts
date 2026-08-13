import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const SUPPORTED_LOCALES = ["en", "nl"] as const;

export type LocaleSource =
  | "account"
  | "cookie"
  | "url"
  | "accept-language"
  | "default";

export type ResolvedLocale = {
  locale: Locale;
  source: LocaleSource;
};

/** Validate any external locale string; unknown → null (never invent). */
export function parsePreferredLocale(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isLocale(normalized) ? normalized : null;
}

/**
 * ADR-001 preference order (explicit choice never auto-overwritten by detection):
 * 1. account preferred_locale
 * 2. explicit locale cookie
 * 3. URL locale
 * 4. Accept-Language (only when caller marks first-entry eligible)
 * 5. English
 */
export function resolvePreferredLocale(input: {
  accountLocale?: string | null;
  cookieLocale?: string | null;
  urlLocale?: string | null;
  acceptLanguage?: string | null;
  allowAcceptLanguage?: boolean;
}): ResolvedLocale {
  const account = parsePreferredLocale(input.accountLocale);
  if (account) return { locale: account, source: "account" };

  const cookie = parsePreferredLocale(input.cookieLocale);
  if (cookie) return { locale: cookie, source: "cookie" };

  const url = parsePreferredLocale(input.urlLocale);
  if (url) return { locale: url, source: "url" };

  if (input.allowAcceptLanguage && input.acceptLanguage) {
    const al = input.acceptLanguage.toLowerCase();
    if (al.includes("nl")) return { locale: "nl", source: "accept-language" };
  }

  return { locale: defaultLocale, source: "default" };
}
