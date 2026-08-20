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

type LanguageSwitcherProps = {
  className?: string;
  /** Compact segmented control for desktop header */
  size?: "default" | "compact";
};

export function LanguageSwitcher({
  className,
  size = "default",
}: LanguageSwitcherProps) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pathname: bare } = stripLocalePrefix(pathname);
  const safeQuery = filterSearchParams(searchParams);
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap [word-break:normal] [overflow-wrap:normal]",
        compact
          ? "gap-0 rounded-md border border-border p-0.5"
          : "gap-1 rounded-lg border border-border p-1",
        className,
      )}
      role="group"
      aria-label={t("language.label")}
    >
      {locales.map((code, index) => {
        const href = appendFilteredSearch(withLocale(bare, code), safeQuery);
        const active = code === locale;
        return (
          <span key={code} className="inline-flex items-center">
            {compact && index > 0 ? (
              <span className="px-0.5 text-xs text-muted/70" aria-hidden="true">
                |
              </span>
            ) : null}
            <a
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
                "inline-flex items-center justify-center rounded-md font-medium transition-colors touch-manipulation",
                "whitespace-nowrap [word-break:normal] [overflow-wrap:normal]",
                compact
                  ? "min-h-8 min-w-8 px-2 text-xs"
                  : "min-h-11 min-w-11 px-3 text-small",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
              aria-current={active ? "true" : undefined}
              aria-label={localeLabels[code as Locale]}
            >
              {code.toUpperCase()}
            </a>
          </span>
        );
      })}
    </div>
  );
}
