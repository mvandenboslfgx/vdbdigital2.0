import {
  generateSeoLandingMetadata,
  SeoLandingPage,
} from "@/lib/seo/seo-landing-page";

export async function generateMetadata() {
  return generateSeoLandingMetadata("maatwerkSoftware");
}

export default async function Page() {
  return <SeoLandingPage pageKey="maatwerkSoftware" />;
}
