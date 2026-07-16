"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utilities/cn";
import { useI18n } from "@/i18n/provider";
import {
  locales,
  localeLabels,
  stripLocalePrefix,
  withLocale,
  type Locale,
} from "@/i18n/config";
import {
  appendFilteredSearch,
  filterSearchParams,
} from "@/i18n/locale-query";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pathname: bare } = stripLocalePrefix(pathname);
  const safeQuery = filterSearchParams(searchParams);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border p-1",
        className,
      )}
      role="group"
      aria-label={t("language.label")}
    >
      {locales.map((code) => {
        const href = appendFilteredSearch(withLocale(bare, code), safeQuery);
        const active = code === locale;
        return (
          <a
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            // Full navigation so root layout + middleware re-apply `lang` / cookies.
            onClick={(event) => {
              if (active) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              window.location.assign(href);
            }}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-small transition-colors touch-manipulation",
              active
                ? "bg-primary-soft text-primary font-medium"
                : "text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
            aria-current={active ? "true" : undefined}
            aria-label={localeLabels[code as Locale]}
          >
            {code.toUpperCase()}
          </a>
        );
      })}
    </div>
  );
}
