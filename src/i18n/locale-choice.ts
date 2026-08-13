import { parsePreferredLocale } from "@/i18n/preference";
import type { Locale } from "@/i18n/config";

/**
 * `NEXT_LOCALE` mirrors the URL locale of every request (see `src/middleware.ts`),
 * so on its own it cannot tell an explicit language choice apart from "this
 * visitor happened to open a /nl link". This cookie records the *deliberate*
 * choice and where it came from, which is what ADR-001 needs to keep detection
 * from overwriting an explicit preference.
 *
 * - `user`: the visitor picked a language themselves (language switcher).
 * - `account`: synced from `profiles.preferred_locale` for a signed-in account.
 */
export const LOCALE_CHOICE_COOKIE = "vdb_locale_choice";

export const LOCALE_CHOICE_MAX_AGE = 60 * 60 * 24 * 365;

export type LocaleChoiceSource = "user" | "account";

export type LocaleChoice = {
  source: LocaleChoiceSource;
  locale: Locale;
};

export function serializeLocaleChoice(choice: LocaleChoice): string {
  return `${choice.source}:${choice.locale}`;
}

/** Unknown/garbage values resolve to null — never guess a locale. */
export function parseLocaleChoice(
  raw: string | null | undefined,
): LocaleChoice | null {
  if (!raw) return null;
  const [source, value] = raw.trim().toLowerCase().split(":");
  if (source !== "user" && source !== "account") return null;
  const locale = parsePreferredLocale(value);
  if (!locale) return null;
  return { source, locale };
}

/**
 * The locale a signed-in session should land on, and whether the account row
 * still needs to be written.
 *
 * A guest who explicitly picked a language keeps that language after signing in,
 * and it is adopted as their account preference — but only when the account has
 * no preference yet. An existing account preference always wins and is never
 * overwritten by a cookie.
 */
export function resolveLoginLocaleSync(input: {
  accountLocale: string | null | undefined;
  choiceCookie: string | null | undefined;
  requestLocale: Locale;
}): {
  locale: Locale;
  cookieChoice: LocaleChoice | null;
  persistToAccount: Locale | null;
} {
  const accountLocale = parsePreferredLocale(input.accountLocale);
  if (accountLocale) {
    return {
      locale: accountLocale,
      cookieChoice: { source: "account", locale: accountLocale },
      persistToAccount: null,
    };
  }

  const choice = parseLocaleChoice(input.choiceCookie);
  if (choice?.source === "user") {
    return {
      locale: choice.locale,
      cookieChoice: { source: "account", locale: choice.locale },
      persistToAccount: choice.locale,
    };
  }

  return {
    locale: input.requestLocale,
    cookieChoice: null,
    persistToAccount: null,
  };
}

/**
 * On sign-out an account-derived choice must not leak into the next session on
 * a shared device; a choice the visitor made themselves survives.
 */
export function shouldClearChoiceOnLogout(
  choiceCookie: string | null | undefined,
): boolean {
  return parseLocaleChoice(choiceCookie)?.source === "account";
}
