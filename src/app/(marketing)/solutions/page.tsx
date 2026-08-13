import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("overview", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.solutions,
    locale
  );
}

export default async function SolutionsPage() {
  const locale = await getLocale();
  const { t } = await getDictionary();
  const page = getSolutionContent("overview", locale);

  return (
    <SolutionPageContent
      {...page}
      ctaHref="/contact"
      ctaLabel={t("cases.discuss")}
    />
  );
}
