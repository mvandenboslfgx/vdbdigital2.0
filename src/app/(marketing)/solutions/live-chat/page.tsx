import { permanentRedirect } from "next/navigation";
import { paths, withLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/get-dictionary";

/** Permanent alias → canonical /solutions/livechat */
export default async function LiveChatAliasPage() {
  const locale = await getLocale();
  permanentRedirect(withLocale(paths.livechat, locale));
}
