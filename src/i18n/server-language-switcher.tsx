import "server-only";

import { Globe } from "lucide-react";
import { headers } from "next/headers";
import { cn } from "@/lib/utilities/cn";
import { getLocale } from "@/i18n/get-dictionary";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { buildLanguageSwitchHref } from "@/i18n/locale-query";

/**
 * Premium server language switcher (ADR-001 Phase 7).
 * Native language names + globe; no flags as sole identifier.
 *
 * Server layouts (unlike pages) never receive `searchParams`, so this can
 * only ever preserve the pathname — never the query string. Use the client
 * `LanguageSwitcherBoundary` instead wherever a safe query param (e.g.
 * `?product=`, `?category=`) must survive the language switch.
 */
export async function ServerLanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const locale = await getLocale();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/";
  const groupLabel = locale === "nl" ? "Taal kiezen" : "Choose language";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 flex-nowrap items-center gap-1 rounded-md border border-border/80 p-0.5",
        className,
      )}
      role="group"
      aria-label={groupLabel}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center text-muted" aria-hidden>
        <Globe className="h-4 w-4" strokeWidth={1.75} />
      </span>
      {locales.map((code) => {
        const { href } = buildLanguageSwitchHref(pathname, new URLSearchParams(), code);
        const active = code === locale;
        const label = localeLabels[code as Locale];
        return (
          <a
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            className={cn(
              "text-nowrap-safe inline-flex items-center justify-center rounded px-2.5 font-medium transition-colors touch-manipulation",
              compact
                ? "min-h-9 min-w-[2.25rem] text-xs"
                : "min-h-10 px-3 text-small",
              active
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-current={active ? "true" : undefined}
            aria-label={label}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
