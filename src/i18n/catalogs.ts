import { defaultLocale, type Locale } from "./config";
import en from "./messages/en";
import nl from "./messages/nl";
import type { Messages } from "./messages/en";

export const catalogs: Record<Locale, Messages> = { en, nl };

export function getCatalog(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

export function lookupMessage(
  messages: Messages,
  path: string,
): string | undefined {
  const parts = path.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}
