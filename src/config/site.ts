import { paths } from "@/i18n/config";

function envOrEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const siteConfig = {
  name: "VDB Digital Software",
  legalName: "VDB Digital Software",
  tagline: "Software built around your business.",
  description:
    "VDB Digital Software builds fast, scalable digital systems for businesses, entrepreneurs and ambitious ideas — custom websites, webshops, AI automation and ongoing support.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://vdbdigital.nl",
  contactEmail: envOrEmpty(process.env.NEXT_PUBLIC_CONTACT_EMAIL) || "info@vdbdigital.nl",
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
    phone: envOrEmpty(process.env.NEXT_PUBLIC_COMPANY_PHONE),
  },
  social: {
    linkedin: envOrEmpty(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
    instagram: envOrEmpty(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
  },
  paths,
  navigation: {
    main: [
      { labelKey: "nav.solutions", href: paths.solutions },
      { labelKey: "nav.shop", href: paths.shop },
      { labelKey: "nav.cases", href: paths.cases },
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
      { labelKey: "solutions.customSoftware", href: paths.customSoftware },
      { labelKey: "solutions.websiteMaintenance", href: paths.websiteMaintenance },
    ],
      mobile: {
      solutionsOverview: {
        labelKey: "nav.allSolutions",
        href: paths.solutions,
      },
      business: [{ labelKey: "nav.quote", href: paths.quote }],
      primaryLinks: [
        { labelKey: "nav.shop", href: paths.shop },
        { labelKey: "nav.cases", href: paths.cases },
        { labelKey: "nav.process", href: paths.process },
        { labelKey: "nav.about", href: paths.about },
        { labelKey: "nav.support", href: paths.support },
      ],
      introHref: `${paths.contact}?intent=introduction`,
    },
    footer: {
      product: [
        { labelKey: "nav.shop", href: paths.shop },
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
      legal: [
        { labelKey: "legal.privacy", href: paths.privacy },
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
    lastUpdated: "2026-07-15",
  },
  brand: {
    logo: "/brand/vdb-digital-logo.png",
    logoAlt: "VDB Digital Software",
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
