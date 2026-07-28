import "server-only";

import Link from "next/link";
import type { ComponentProps } from "react";
import { withLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/get-dictionary";

type ServerLocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Locale-aware Link for server components: prefixes `/nl` when locale is Dutch. */
export async function ServerLocaleLink({
  href,
  prefetch,
  ...props
}: ServerLocaleLinkProps) {
  const locale = await getLocale();
  const localized = withLocale(href, locale);
  return <Link href={localized} prefetch={prefetch} {...props} />;
}
