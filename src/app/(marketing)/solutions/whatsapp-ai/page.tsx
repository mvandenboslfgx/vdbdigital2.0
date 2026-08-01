import {
  SolutionPageContent,
  createSolutionMetadata,
} from "@/components/sections/solution-page";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";
import { paths } from "@/i18n/config";
import { getSolutionContent } from "@/i18n/content/solutions";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata() {
  const locale = await getLocale();
  const content = getSolutionContent("whatsapp-ai", locale);
  return createSolutionMetadata(
    content.metaTitle,
    content.metaDescription,
    paths.whatsappAi,
    locale
  );
}

export default async function WhatsappAiPage() {
  const locale = await getLocale();
  const page = getSolutionContent("whatsapp-ai", locale);

  const visualTitle =
    locale === "nl" ? "WhatsApp AI met overdracht" : "WhatsApp AI with handover";
  const visualSteps =
    locale === "nl"
      ? [
          { label: "Klant stelt een vraag" },
          { label: "AI beantwoordt goedgekeurde FAQ" },
          { label: "Leadgegevens worden vastgelegd" },
          { label: "Overdracht naar medewerker bij nuance" },
        ]
      : [
          { label: "Customer asks a question" },
          { label: "AI answers approved FAQ topics" },
          { label: "Lead details are captured" },
          { label: "Handover to a teammate when nuance is needed" },
        ];

  return (
    <SolutionPageContent
      {...page}
      visual={<WhatsAppAiChatVisual title={visualTitle} steps={visualSteps} />}
    />
  );
}
