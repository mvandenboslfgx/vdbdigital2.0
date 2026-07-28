"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";

/** Wraps interactive form islands that still need the message catalog. */
export function MessagesProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      {children}
    </I18nProvider>
  );
}
