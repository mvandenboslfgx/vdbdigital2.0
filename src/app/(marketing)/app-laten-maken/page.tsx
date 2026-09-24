import {
  generateSeoLandingMetadata,
  SeoLandingPage,
} from "@/lib/seo/seo-landing-page";

export async function generateMetadata() {
  return generateSeoLandingMetadata("appLatenMaken");
}

export default function Page() {
  return <SeoLandingPage pageKey="appLatenMaken" />;
}
