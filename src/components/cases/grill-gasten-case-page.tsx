import { PortfolioCasePage } from "@/components/cases/portfolio-case-page";
import type { getCommercialContent } from "@/i18n/content/commercial";
import { paths } from "@/i18n/config";

type GrillCopy = ReturnType<typeof getCommercialContent>["grillGasten"];

export function GrillGastenCasePage({
  locale,
  copy,
}: {
  locale: "en" | "nl";
  copy: GrillCopy;
}) {
  return (
    <PortfolioCasePage
      locale={locale}
      copy={copy}
      assetDir="grill-gasten"
      domainLabel="grillgasten.eu"
      launchStatus="LIVE"
      liveUrl="https://www.grillgasten.eu/"
      caseHref={`${paths.cases}/grill-gasten`}
      galleryFile="menu-preview.webp"
      discussLabel={
        locale === "nl" ? "Bespreek jouw website" : "Discuss your website"
      }
    />
  );
}
