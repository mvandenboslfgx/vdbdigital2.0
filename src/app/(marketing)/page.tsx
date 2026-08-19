import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemsSection } from "@/components/sections/problems-section";
import { SolutionsGridSection } from "@/components/sections/solutions-grid-section";
import { PackagesSection } from "@/components/sections/packages-section";
import { ProcessStepsSection } from "@/components/sections/process-steps-section";
import { CasePreviewSection } from "@/components/sections/case-preview-section";
import { CtaSection } from "@/components/sections/cta-section";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const title = t("home.metaTitle");
  const description = t("home.metaDescription");

  return {
    title: { absolute: title },
    description,
    alternates: buildLocaleAlternates("/", locale),
    openGraph: {
      title,
      description,
      locale: openGraphLocale(locale),
    },
  };
}

export default async function HomePage() {
  return (
    <>
      <HeroSection />
      <SolutionsGridSection />
      <PackagesSection />
      <CasePreviewSection />
      <ProcessStepsSection />
      <ProblemsSection />
      <CtaSection />
    </>
  );
}
