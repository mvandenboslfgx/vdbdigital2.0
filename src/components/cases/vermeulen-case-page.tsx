import { PortfolioCasePage } from "@/components/cases/portfolio-case-page";
import type { getCommercialContent } from "@/i18n/content/commercial";
import { paths } from "@/i18n/config";

type VermeulenCopy = ReturnType<typeof getCommercialContent>["vermeulen"];

export function VermeulenCasePage({
  locale,
  copy,
}: {
  locale: "en" | "nl";
  copy: VermeulenCopy;
}) {
  return (
    <PortfolioCasePage
      locale={locale}
      copy={copy}
      assetDir="vermeulen-bouwservice"
      domainLabel="vermeulenbouwservice.nl"
      launchStatus="LIVE"
      liveUrl="https://www.vermeulenbouwservice.nl/"
      caseHref={`${paths.cases}/vermeulen-bouwservice`}
      galleryFile="full-page.webp"
      discussLabel={
        locale === "nl" ? "Bespreek uw website" : "Discuss your website"
      }
    />
  );
}
