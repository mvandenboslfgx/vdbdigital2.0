import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemsSection } from "@/components/sections/problems-section";
import { SolutionsGridSection } from "@/components/sections/solutions-grid-section";
import { PackagesSection } from "@/components/sections/packages-section";
import { ProcessStepsSection } from "@/components/sections/process-steps-section";
import { CasePreviewSection } from "@/components/sections/case-preview-section";
import { CtaSection } from "@/components/sections/cta-section";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — ${siteConfig.tagline}`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  return (
    <>
      <HeroSection />
      <CasePreviewSection />
      <SolutionsGridSection />
      <ProcessStepsSection />
      <PackagesSection />
      <ProblemsSection />
      <CtaSection />
    </>
  );
}
