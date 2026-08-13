import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("livechat", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.livechat,
    locale
  );
}

export default async function LivechatPage() {
  const locale = await getLocale();
  const page = getSolutionContent("livechat", locale);

  return <SolutionPageContent {...page} />;
}
