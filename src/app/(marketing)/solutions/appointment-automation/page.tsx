import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("appointment-automation", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.appointmentAutomation,
  );
}

export default async function AppointmentAutomationPage() {
  const locale = await getLocale();
  const page = getSolutionContent("appointment-automation", locale);
  return <SolutionPageContent {...page} />;
}
