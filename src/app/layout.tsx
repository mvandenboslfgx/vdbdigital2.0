import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { I18nProvider } from "@/i18n/provider";

export const viewport: Viewport = {
  themeColor: siteConfig.brand.themeColor,
  colorScheme: "dark light",
};

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  // optional: avoid font-swap CLS on LCP text; fallback metrics stay stable
  display: "optional",
  adjustFontFallback: true,
});

const displayFont = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "optional",
  adjustFontFallback: true,
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "optional",
  adjustFontFallback: true,
});

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
  const messages = await getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <OrganizationJsonLd />
        <I18nProvider locale={locale} messages={messages}>
          <ConsentProvider>{children}</ConsentProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
