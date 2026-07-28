import { permanentRedirect } from "next/navigation";
import { paths, withLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/get-dictionary";

/** Permanent alias → canonical /solutions/reviewflows */
export default async function ReviewFlowsAliasPage() {
  const locale = await getLocale();
  permanentRedirect(withLocale(paths.reviewflows, locale));
}
