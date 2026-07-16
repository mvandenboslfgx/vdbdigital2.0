import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { AutomationFlowVisual } from "@/components/visuals/automation-flow-visual";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("webshops", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.webshops,
  );
}

export default async function WebshopsPage() {
  const locale = await getLocale();
  const page = getSolutionContent("webshops", locale);

  const visualTitle =
    locale === "nl" ? "Webshopflow" : "Store flow";
  const visualSteps =
    locale === "nl"
      ? ["Catalogus", "Winkelwagen", "Mollie checkout", "Orderbevestiging"]
      : ["Catalogue", "Cart", "Mollie checkout", "Order confirmation"];

  return (
    <SolutionPageContent
      {...page}
      visual={<AutomationFlowVisual title={visualTitle} steps={visualSteps} />}
    />
  );
}
