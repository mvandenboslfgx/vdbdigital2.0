"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";

const LocaleContext = createContext<Locale | null>(null);

/** Lightweight locale context — no message catalog in the client tree. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (locale) return locale;
  if (typeof document !== "undefined") {
    return document.documentElement.lang === "nl" ? "nl" : "en";
  }
  return "en";
}
