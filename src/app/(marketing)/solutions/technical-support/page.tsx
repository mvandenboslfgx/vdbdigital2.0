import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("technical-support", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.technicalSupport,
    locale
  );
}

export default async function TechnicalSupportPage() {
  const locale = await getLocale();
  const page = getSolutionContent("technical-support", locale);
  return <SolutionPageContent {...page} />;
}
