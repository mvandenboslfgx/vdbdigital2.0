import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemsSection } from "@/components/sections/problems-section";
import { SolutionsGridSection } from "@/components/sections/solutions-grid-section";
import { PackagesSection } from "@/components/sections/packages-section";
import { FoundingClientSection } from "@/components/sections/founding-client-section";
import { ProcessStepsSection } from "@/components/sections/process-steps-section";
import { CasePreviewSection } from "@/components/sections/case-preview-section";
import { FeaturedProjectsSection } from "@/components/sections/featured-vermeulen-section";
import { PopularProductsSection } from "@/components/sections/popular-products-section";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";
import { getFeaturedProductsList } from "@/server/repositories/products";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: siteConfig.tagline,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const products = await getFeaturedProductsList();

  return (
    <>
      <HeroSection />
      <ProblemsSection />
      <SolutionsGridSection />
      <PackagesSection />
      <FoundingClientSection />
      <ProcessStepsSection />
      <FeaturedProjectsSection />
      <CasePreviewSection />
      <PopularProductsSection products={products} />
      <FaqSection />
      <CtaSection />
    </>
  );
}
