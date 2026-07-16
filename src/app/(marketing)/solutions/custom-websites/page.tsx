import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

/** Alias of /solutions/websites */
export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("websites", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.customWebsites,
  );
}

export default async function CustomWebsitesAliasPage() {
  const locale = await getLocale();
  const page = getSolutionContent("websites", locale);

  return (
    <SolutionPageContent
      {...page}
      visual={<WebsitePreviewVisual />}
    />
  );
}
