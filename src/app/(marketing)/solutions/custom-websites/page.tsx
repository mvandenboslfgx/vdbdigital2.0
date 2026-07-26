import { permanentRedirect } from "next/navigation";
import { paths, withLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/get-dictionary";

/** Permanent alias → canonical /solutions/websites */
export default async function CustomWebsitesAliasPage() {
  const locale = await getLocale();
  permanentRedirect(withLocale(paths.websites, locale));
}
