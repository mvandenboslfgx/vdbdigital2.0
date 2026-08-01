"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { withLocale, stripLocalePrefix, isLocale, type Locale } from "@/i18n/config";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function asLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

/** Locale-aware Link: prefixes `/nl` when the active locale is Dutch. */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = asLocale(useLocale());
  const localized = withLocale(href, locale);
  return <Link href={localized} {...props} />;
}

export function useLocalizedPath(href: string): string {
  const locale = asLocale(useLocale());
  return withLocale(href, locale);
}

export function useLocalePathname(): string {
  const pathname = usePathname();
  return stripLocalePrefix(pathname).pathname;
}
