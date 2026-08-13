import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Resolve locale for the current request.
 * Preference order (full account sync lands in Phase 2):
 * 1. x-locale from middleware (URL context)
 * 2. NEXT_LOCALE cookie (explicit choice)
 * 3. English fallback
 */
export async function resolveRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-locale");
  if (fromHeader && isLocale(fromHeader)) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  return defaultLocale;
}
