import type { Metadata } from "next";
import { LegalDocumentBody } from "@/components/sections/legal-document-body";
import { paths } from "@/i18n/config";
import { getLegalContent } from "@/i18n/content/legal";
import { siteConfig } from "@/config/site";
import { buildLocaleAlternates } from "@/i18n/seo";
import { getLocale } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = getLegalContent("cookies", locale, {
    legalName: siteConfig.legalName,
    contactEmail: siteConfig.contactEmail,
    supportEmail: siteConfig.supportEmail,
    privacyContact: siteConfig.legal.privacyContact,
  });

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: buildLocaleAlternates(paths.cookies, locale),
  };
}

export default function CookiesPage() {
  return <LegalDocumentBody page="cookies" />;
}
