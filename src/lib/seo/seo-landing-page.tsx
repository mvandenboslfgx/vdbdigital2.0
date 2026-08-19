import { redirect } from "next/navigation";
import { SolutionPageContent } from "@/components/sections/solution-page";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { ServiceJsonLd } from "@/components/seo/service-json-ld";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { AutomationFlowVisual } from "@/components/visuals/automation-flow-visual";
import { WebshopCheckoutVisual } from "@/components/visuals/webshop-checkout-visual";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";
import { Container, Section } from "@/components/ui/container";
import {
  getSeoLandingContent,
  getSeoLocalContent,
  type SeoLandingPageKey,
  type SeoLocalContent,
} from "@/i18n/content/seo-landing-pages";
import { getLocale } from "@/i18n/get-dictionary";
import { createSeoLandingMetadata } from "@/lib/seo/metadata";
import {
  getSeoPath,
  seoEnglishEquivalent,
  type SeoLocalLocation,
} from "@/config/seo-routes";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateSeoLandingMetadata(
  key: SeoLandingPageKey,
): Promise<Metadata> {
  const locale = await getLocale();
  const path = getSeoPath(key);
  const content = getSeoLandingContent(key);
  return createSeoLandingMetadata(
    content.metaTitle,
    content.metaDescription,
    path,
    locale,
  );
}

export async function generateSeoLocalMetadata(
  key: SeoLandingPageKey,
  location: SeoLocalLocation,
): Promise<Metadata> {
  const locale = await getLocale();
  const path = `${getSeoPath(key)}/${location}`;
  const content = getSeoLocalContent(key, location);
  return createSeoLandingMetadata(
    content.metaTitle,
    content.metaDescription,
    path,
    locale,
  );
}

function getSeoVisual(pageKey: SeoLandingPageKey): ReactNode {
  switch (pageKey) {
    case "websiteLatenMaken":
    case "webdesign":
      return <WebsitePreviewVisual />;
    case "webshopLatenMaken":
      return <WebshopCheckoutVisual />;
    case "aiAutomatisering":
    case "maatwerkSoftware":
    case "klantportaalLatenMaken":
      return (
        <AutomationFlowVisual
          title="Automatiseringsflow"
          steps={["Trigger", "Verwerking", "Notificatie", "Opvolging"]}
        />
      );
    case "aiChatbot":
    case "whatsappAutomatisering":
      return (
        <WhatsAppAiChatVisual
          title="WhatsApp-gesprek"
          steps={[
            { label: "Klant stelt vraag" },
            { label: "AI beantwoordt FAQ" },
            { label: "Leadgegevens verzameld" },
            { label: "Overdracht naar team" },
          ]}
        />
      );
    default:
      return null;
  }
}

interface SeoLandingPageProps {
  pageKey: SeoLandingPageKey;
  location?: SeoLocalLocation;
}

export async function SeoLandingPage({ pageKey, location }: SeoLandingPageProps) {
  const locale = await getLocale();
  const path = location
    ? `${getSeoPath(pageKey)}/${location}`
    : getSeoPath(pageKey);

  if (locale === "en") {
    redirect(seoEnglishEquivalent[path] ?? seoEnglishEquivalent[getSeoPath(pageKey)] ?? "/");
  }

  const content = location
    ? getSeoLocalContent(pageKey, location)
    : getSeoLandingContent(pageKey);

  const localContent = location ? (content as SeoLocalContent) : null;

  const breadcrumbs = location && localContent
    ? [
        { name: "Home", path: "/" },
        {
          name: pageKey === "websiteLatenMaken" ? "Website laten maken" : "Webdesign",
          path: getSeoPath(pageKey),
        },
        { name: localContent.locationLabel, path },
      ]
    : [
        { name: "Home", path: "/" },
        { name: content.title.split(" ").slice(0, 4).join(" "), path },
      ];

  return (
    <>
      <ServiceJsonLd
        name={content.title}
        description={content.description}
        path={path}
        locale={locale}
      />
      {content.faq?.length ? <FaqJsonLd items={content.faq} /> : null}
      <BreadcrumbJsonLd items={breadcrumbs} locale={locale} />
      {location && localContent ? (
        <Section variant="light" className="pt-6 pb-0">
          <Container className="max-w-3xl">
            <p className="text-small text-light-muted">{localContent.regionContext}</p>
          </Container>
        </Section>
      ) : null}
      <SolutionPageContent {...content} visual={getSeoVisual(pageKey)} />
    </>
  );
}
