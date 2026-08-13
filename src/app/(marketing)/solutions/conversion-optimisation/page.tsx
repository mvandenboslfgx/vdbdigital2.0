import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("conversion-optimisation", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.conversionOptimisation,
    locale
  );
}

export default async function ConversionOptimisationPage() {
  const locale = await getLocale();
  const page = getSolutionContent("conversion-optimisation", locale);
  return <SolutionPageContent {...page} />;
}
