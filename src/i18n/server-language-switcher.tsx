import "server-only";

import { headers } from "next/headers";
import { cn } from "@/lib/utilities/cn";
import { getLocale } from "@/i18n/get-dictionary";
import {
  locales,
  localeLabels,
  stripLocalePrefix,
  withLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Server-rendered language switcher — no client JS / Suspense / useSearchParams.
 * Query strings are intentionally not preserved (marketing pages rarely need them).
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
  const { pathname: bare } = stripLocalePrefix(pathname);
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
        const href = withLocale(bare, code);
        const active = code === locale;
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
                : "min-h-10 min-w-[2.5rem] text-small",
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
