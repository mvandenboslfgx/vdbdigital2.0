import { notFound } from "next/navigation";
import {
  generateSeoLocalMetadata,
  SeoLandingPage,
} from "@/lib/seo/seo-landing-page";
import { seoLocalLocations } from "@/config/seo-routes";
import type { SeoLocalLocation } from "@/config/seo-routes";

interface PageProps {
  params: Promise<{ location: string }>;
}

export async function generateStaticParams() {
  return seoLocalLocations.map((location) => ({ location }));
}

export async function generateMetadata({ params }: PageProps) {
  const { location } = await params;
  if (!seoLocalLocations.includes(location as SeoLocalLocation)) {
    return {};
  }
  return generateSeoLocalMetadata(
    "websiteLatenMaken",
    location as SeoLocalLocation,
  );
}

export default async function Page({ params }: PageProps) {
  const { location } = await params;
  if (!seoLocalLocations.includes(location as SeoLocalLocation)) {
    notFound();
  }

  return (
    <SeoLandingPage
      pageKey="websiteLatenMaken"
      location={location as SeoLocalLocation}
    />
  );
}
