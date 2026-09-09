import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

/**
 * Alias of /solutions/reviewflows — same content, so canonicalize here
 * to the primary URL rather than self-canonicalizing (avoids duplicate
 * content across two indexable URLs).
 */
export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("reviewflows", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.reviewflows,
  );
}

export default async function ReviewFlowsAliasPage() {
  const locale = await getLocale();
  const page = getSolutionContent("reviewflows", locale);

  return <SolutionPageContent {...page} path={paths.reviewflows} />;
}
