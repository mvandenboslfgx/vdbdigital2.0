import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("websites", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.websites,
    locale
  );
}

export default async function WebsitesPage() {
  const locale = await getLocale();
  const page = getSolutionContent("websites", locale);

  return (
    <SolutionPageContent
      {...page}
      visual={<WebsitePreviewVisual />}
    />
  );
}
