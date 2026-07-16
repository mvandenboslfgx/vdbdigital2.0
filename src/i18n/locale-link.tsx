"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/provider";
import { withLocale, stripLocalePrefix } from "@/i18n/config";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Locale-aware Link: prefixes `/nl` when the active locale is Dutch. */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { locale } = useI18n();
  const localized = withLocale(href, locale);
  return <Link href={localized} {...props} />;
}

export function useLocalizedPath(href: string): string {
  const { locale } = useI18n();
  return withLocale(href, locale);
}

export function useLocalePathname(): string {
  const pathname = usePathname();
  return stripLocalePrefix(pathname).pathname;
}
