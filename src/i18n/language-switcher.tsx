"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utilities/cn";
import { useLocale } from "@/i18n/locale-provider";
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

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** Header-sized segment; keeps EN/NL on one horizontal row */
  compact?: boolean;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pathname: bare } = stripLocalePrefix(pathname);
  const safeQuery = filterSearchParams(searchParams);
  const groupLabel = locale === "nl" ? "Taal" : "Language";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 flex-nowrap items-center gap-0.5 rounded-md border border-border/80 p-0.5",
        className,
      )}
      role="group"
      aria-label={groupLabel}
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
            onClick={(event) => {
              if (active) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              window.location.assign(href);
            }}
            className={cn(
              "text-nowrap-safe inline-flex items-center justify-center rounded px-2.5 font-medium transition-colors touch-manipulation",
              compact ? "min-h-9 min-w-[2.25rem] text-xs" : "min-h-10 min-w-[2.5rem] text-small",
              active
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-current={active ? "true" : undefined}
            aria-label={`${code.toUpperCase()} — ${localeLabels[code as Locale]}`}
          >
            {code.toUpperCase()}
          </a>
        );
      })}
    </div>
  );
}
