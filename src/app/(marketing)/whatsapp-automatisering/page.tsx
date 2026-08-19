import {
  generateSeoLandingMetadata,
  SeoLandingPage,
} from "@/lib/seo/seo-landing-page";

export async function generateMetadata() {
  return generateSeoLandingMetadata("whatsappAutomatisering");
}

export default async function Page() {
  return <SeoLandingPage pageKey="whatsappAutomatisering" />;
}
