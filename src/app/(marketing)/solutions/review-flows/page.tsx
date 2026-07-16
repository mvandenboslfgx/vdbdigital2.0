import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

/** Alias of /solutions/reviewflows */
export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("reviewflows", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.reviewFlows,
  );
}

export default async function ReviewFlowsAliasPage() {
  const locale = await getLocale();
  const page = getSolutionContent("reviewflows", locale);

  return <SolutionPageContent {...page} />;
}
