"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { withLocale, stripLocalePrefix } from "@/i18n/config";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Locale-aware Link: prefixes `/nl` when the active locale is Dutch. */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  const localized = withLocale(href, locale);
  return <Link href={localized} {...props} />;
}

export function useLocalizedPath(href: string): string {
  const locale = useLocale();
  return withLocale(href, locale);
}

export function useLocalePathname(): string {
  const pathname = usePathname();
  return stripLocalePrefix(pathname).pathname;
}
