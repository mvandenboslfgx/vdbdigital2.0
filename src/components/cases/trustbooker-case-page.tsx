import { PortfolioCasePage } from "@/components/cases/portfolio-case-page";
import type { getCommercialContent } from "@/i18n/content/commercial";
import { paths } from "@/i18n/config";

type TrustbookerCopy = ReturnType<typeof getCommercialContent>["trustbooker"];

export function TrustbookerCasePage({
  locale,
  copy,
}: {
  locale: "en" | "nl";
  copy: TrustbookerCopy;
}) {
  return (
    <PortfolioCasePage
      locale={locale}
      copy={copy}
      assetDir="trustbooker"
      domainLabel="TrustBooker"
      launchStatus="COMING_SOON"
      liveUrl={null}
      caseHref={`${paths.cases}/trustbooker`}
      desktopFile="desktop-dashboard.webp"
      mobileFile="mobile-preview.webp"
      galleryFile="platform-preview.webp"
      showLiveButtons={false}
      discussLabel={
        locale === "nl"
          ? "Softwareproject bespreken"
          : "Discuss a software project"
      }
      secondaryCtaHref={`${paths.contact}?intent=software`}
      secondaryCtaLabel={
        locale === "nl" ? "Contact opnemen" : "Get in touch"
      }
    />
  );
}
