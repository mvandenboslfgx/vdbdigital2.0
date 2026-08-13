import "server-only";
import { defaultLocale, isLocale, type Locale } from "./config";
import { createT, type TranslateFn } from "./create-t";
import { getCatalog } from "./catalogs";
import { resolveRequestLocale } from "./resolve-locale";
import type { Messages } from "./messages/en";

export type { TranslateFn };

/** Compatibility locale resolver; next-intl request config uses the same source. */
export async function getLocale(): Promise<Locale> {
  try {
    return await resolveRequestLocale();
  } catch {
    return defaultLocale;
  }
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  const resolved = locale ?? (await getLocale());
  return getCatalog(isLocale(resolved) ? resolved : defaultLocale);
}

/**
 * Compatibility dictionary API used by existing server components.
 * Runtime catalogs are shared with next-intl (`src/i18n/request.ts`).
 */
export async function getDictionary(locale?: Locale) {
  const resolved = locale ?? (await getLocale());
  const messages = await getMessages(resolved);
  return {
    locale: resolved,
    messages,
    t: createT(messages),
  };
}
