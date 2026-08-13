import { getRequestConfig } from "next-intl/server";
import { catalogs, getCatalog, lookupMessage } from "./catalogs";
import { resolveRequestLocale } from "./resolve-locale";

export default getRequestConfig(async () => {
  const locale = await resolveRequestLocale();
  const messages = getCatalog(locale);

  return {
    locale,
    messages,
    timeZone: "Europe/Amsterdam",
    now: new Date(),
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[i18n]", error.code, error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      const enValue = lookupMessage(catalogs.en, path);
      if (enValue) return enValue;
      if (process.env.NODE_ENV !== "production") {
        return `MISSING:${path}`;
      }
      return "";
    },
  };
});
