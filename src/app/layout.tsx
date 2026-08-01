import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages as getIntlMessages } from "next-intl/server";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import "@/i18n/global";

export const viewport: Viewport = {
  themeColor: siteConfig.brand.themeColor,
  colorScheme: "dark light",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — ${t("meta.tagline")}`,
      template: `%s | ${siteConfig.name}`,
    },
    description: t("meta.description"),
    manifest: "/brand/site.webmanifest",
    openGraph: {
      type: "website",
      locale: locale === "nl" ? "nl_NL" : "en_GB",
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: t("meta.description"),
      images: [
        {
          url: siteConfig.brand.openGraphImage,
          width: 1200,
          height: 630,
          alt: siteConfig.brand.logoAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: t("meta.description"),
      images: [siteConfig.brand.twitterImage],
    },
    icons: {
      icon: [
        { url: "/brand/favicon.ico" },
        { url: "/brand/favicon.svg", type: "image/svg+xml" },
        { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        {
          url: "/brand/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      other: [
        {
          rel: "mask-icon",
          url: "/brand/safari-pinned-tab.svg",
          color: "#08090b",
        },
      ],
    },
    alternates: {
      languages: {
        en: "/",
        nl: "/nl",
        "x-default": "/",
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getIntlMessages();

  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full flex flex-col antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <OrganizationJsonLd />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
