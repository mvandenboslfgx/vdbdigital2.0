import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * next-intl routing config aligned with ADR-001:
 * - English unprefixed (as-needed)
 * - Dutch under /nl
 * - Detection deferred to our middleware + preference order (Phase 2)
 */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});
