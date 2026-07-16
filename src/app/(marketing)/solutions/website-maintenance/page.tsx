import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("website-maintenance", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.websiteMaintenance,
  );
}

export default async function WebsiteMaintenancePage() {
  const locale = await getLocale();
  const page = getSolutionContent("website-maintenance", locale);
  return <SolutionPageContent {...page} />;
}
