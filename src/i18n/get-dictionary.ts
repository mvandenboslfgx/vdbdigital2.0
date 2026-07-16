import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";
import { createT, type TranslateFn } from "./create-t";
import en from "./messages/en";
import nl from "./messages/nl";
import type { Messages } from "./messages/en";

const catalogs: Record<Locale, Messages> = { en, nl };

export type { TranslateFn };

export async function getLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-locale");
  if (fromHeader && isLocale(fromHeader)) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  return defaultLocale;
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  const resolved = locale ?? (await getLocale());
  return catalogs[resolved];
}

export async function getDictionary(locale?: Locale) {
  const resolved = locale ?? (await getLocale());
  const messages = await getMessages(resolved);
  return {
    locale: resolved,
    messages,
    t: createT(messages),
  };
}
