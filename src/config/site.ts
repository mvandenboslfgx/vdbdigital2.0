import { paths } from "@/i18n/config";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  resolvePublicSiteUrl,
} from "@/lib/url/app-url";

function envOrEmpty(value: string | unddefined): string {
  return value?.trim() ?? "";
}

export const siteConfig = {
  name: "VDB Digital Software",
  legalName: "VDB Digital Software",
  tagline: "Websites, software en AI-automatisering voor bedrijven.",
  description:
    "VDB Digital Software bouwt professionele websites, webshops, AI-automatiseringen, CRM-systemen, klantportalen en maatwerksoftware voor bedrijven in Nederland.",
  url: resolvePublicSiteUrl(),
  canonicalProductionOrigin: CANONICAL_PRODUCTION_ORIGIN,
  contactEmail:
    envOrEmpty(process.env.NEXT_PUBLIC_CONTACT_EMAIL) || "algemeen@vdbdigital.nl",
  supportEmail:
    envOrEmpty(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) || "support@vdbdigital.nl",
  whatsappNumber: envOrEmpty(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  company: {
    legalName: "VDB Digital Software",
    kvk: envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_KVK),
    vat: envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_VAT),
    address: envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_ADDRESS),
    city: envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_CITY),
    country: "Netherlands",
    phone:
      envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_PHONE) || "06 286 00 727",
    phoneTel:
      envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_PHONE_TEL) || "+31628600727",
  },
  social: {
    linkedin: envOrEmpty(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
    instagram: envOrEmpty(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
  },
  paths,
  navigation: {
    main: [
      { labelKey: "nav.solutions", href: paths.solutions },
      { labelKey: "nav.cases", href: paths.cases },
      { labelKey: "nav.shop", href: paths.shop },
      { labelKey: "nav.process", href: paths.process },
      { labelKey: "nav.about", href: paths.about },
      { labelKey: "nav.support", href: paths.support },
    ],
    solutions: [
      { labelKey: "solutions.websites", href: paths.websites },
      { labelKey: "solutions.webshops", href: paths.webshops },
      { labelKey: "solutions.aiAutomation", href: paths.aiAutomation },
      { labelKey: "solutions.whatsappAi", href: paths.whatsappAi },
      { labelKey: "solutions.livechat", href: paths.livechat },
      { labelKey: "solutions.reviewflows", href: paths.reviewflows },
      { labelKey: "solutions.appointmentAutomation", href: paths.appointmentAutomation },
      { labelKey: "solutions.customSoftware", href: paths.customSoftware },
      { labelKey: "solutions.websiteMaintenance", href: paths.websiteMaintenance },
      { labelKey: "solutions.technicalSupport", href: paths.technicalSupport },
      { labelKey: "solutions.conversionOptimisation", href: paths.conversionOptimisation },
    ],
    mobile: {
      solutionsOverview: {
        labelKey: "nav.allSolutions",
        href: paths.solutions,
      },
      business: [{ labelKey: "nav.quote", href: paths.quote }],
      primaryLinks: [
        { labelKey: "nav.cases", href: paths.cases },
        { labelKey: "nav.shop", href: paths.shop },
        { labelKey: "nav.process", href: paths.process },
        { labelKey: "nav.about", href: paths.about },
        { labelKey: "nav.support", href: paths.support },
      ],
      introHref: `${paths.contact}?intent=introduction`,
    },
    footer: {
      product: [
        { labelKey: "nav.shop", href: paths.shop },
        { labelKey: "pillarNav.software", href: paths.shopSoftware },
        { labelKey: "nav.quote", href: paths.quote },
        { labelKey: "nav.process", href: paths.process },
        { labelKey: "nav.solutions", href: paths.solutions },
      ],
      company: [
        { labelKey: "nav.about", href: paths.about },
        { labelKey: "nav.cases", href: paths.cases },
        { labelKey: "nav.contact", href: paths.contact },
        { labelKey: "nav.support", href: paths.support },
      ],
      seo: [
        { labelKey: "footer.seoWebsite", href: paths.websiteLatenMaken },
        { labelKey: "footer.seoWebdesign", href: paths.webdesign },
        { labelKey: "footer.seoWebshop", href: paths.webshopLatenMaken },
        { labelKey: "footer.seoAi", href: paths.aiAutomatisering },
        { labelKey: "footer.seoKennisbank", href: paths.kennisbank },
      ],
      legal: [
        { labelKey: "legal.privacy", href: paths.privacy },
        { labelKey: "legal.accountDeletion", href: paths.accountDeletion },
        { labelKey: "legal.cookies", href: paths.cookies },
        { labelKey: "legal.terms", href: paths.terms },
        { labelKey: "legal.refund", href: paths.refundPolicy },
      ],
    },
  },
  legal: {
    privacyContact:
      envOrEmpty(process.env.NEXT_PUBLIC_PRIVACY_EMAIL) || "privacy@vdbdigital.nl",
    dpo: envOrEmpty(process.env.NEXT_PUBLIC_DPO_CONTACT),
    lastUpdated: "2026-07-24",
  },
  brand: {
    logo: "/brand/vdb-logo-mark-light.svg",
    logoAlt: "VDB Digital Software",
    openGraphImage: "/brand/opengraph-image.svg",
    twitterImage: "/brand/opengraph-image.svg",
    themeColor: "#08090B",
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function hasCompanyLocation(): boolean {
  return Boolean(siteConfig.company.address && siteConfig.company.city);
}

export function hasSocial(network: keyof typeof siteConfig.social): boolean {
  const value = siteConfig.social[network];
  return Boolean(value && value.startsWith("http"));
}
