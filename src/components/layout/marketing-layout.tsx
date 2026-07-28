import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/layout/footer";
import { CookieBannerServer } from "@/components/consent/cookie-banner-server";
import { ContactFabServer } from "@/components/chat/contact-fab-server";
import { FoundingClientBar } from "@/components/commercial/founding-client-bar";
import { isDirectCheckoutEnabled } from "@/config/features";
import { getCart } from "@/features/cart/cart-service";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getFoundingClientState } from "@/server/services/founding-client-service";

export async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getDictionary();
  const locale = await getLocale();
  const founding = await getFoundingClientState();
  const commercial = getCommercialContent(locale);

  let cartItemCount = 0;
  if (isDirectCheckoutEnabled()) {
    const cart = await getCart();
    cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  const cookieLabels = {
    title: t("cookies.title"),
    shortBody: t("cookies.shortBody"),
    more: t("cookies.more"),
    necessary: t("cookies.necessary"),
    necessaryBody: t("cookies.necessaryBody"),
    analytics: t("cookies.analytics"),
    marketing: t("cookies.marketing"),
    acceptAll: t("cookies.acceptAll"),
    rejectAll: t("cookies.rejectAll"),
    customize: t("cookies.customize"),
    save: t("cookies.save"),
  };

  return (
    <>
      <a href="#main-content" className="skiplink">
        {t("nav.skipToContent")}
      </a>
      {founding.showCampaign ? (
        <FoundingClientBar
          message={commercial.founding.bar}
          ctaLabel={commercial.founding.cta}
          dismissLabel={commercial.founding.dismiss}
        />
      ) : null}
      <Header cartItemCount={cartItemCount} />
      <main
        id="main-content"
        className="flex-1 min-h-[calc(100dvh-4.5rem)]"
      >
        {children}
      </main>
      <Footer />
      <CookieBannerServer labels={cookieLabels} />
      <ContactFabServer
        label={t("nav.contact")}
        message={
          locale === "nl"
            ? "Hallo, ik heb een vraag over VDB Digital."
            : "Hello, I have a question about VDB Digital."
        }
      />
    </>
  );
}
