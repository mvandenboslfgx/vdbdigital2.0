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
  const content = getSolutionContent("ai-automation", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.aiAutomation,
  );
}

export default async function AiAutomationPage() {
  const locale = await getLocale();
  const page = getSolutionContent("ai-automation", locale);

  const visualTitle =
    locale === "nl" ? "Automatiseringsflow" : "Automation flow";
  const visualSteps =
    locale === "nl"
      ? ["Trigger", "AI-assistentie", "Regels", "Menselijke escalatie"]
      : ["Trigger", "AI assist", "Rules", "Human escalation"];

  return (
    <SolutionPageContent
      {...page}
      visual={<AutomationFlowVisual title={visualTitle} steps={visualSteps} />}
    />
  );
}
