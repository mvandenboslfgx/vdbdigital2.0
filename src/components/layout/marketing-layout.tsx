import { Header } from "@/components/navigation/header";

import { Footer } from "@/components/layout/footer";

import { CookieBanner } from "@/components/consent/cookie-banner";

import { ChatProvider } from "@/components/chat/chat-provider";

import { FoundingClientBar } from "@/components/commercial/founding-client-bar";

import { getCart } from "@/features/cart/cart-service";

import { getDictionary, getLocale } from "@/i18n/get-dictionary";

import { getCommercialContent } from "@/i18n/content/commercial";

import { getFoundingClientState } from "@/server/services/founding-client-service";



export async function MarketingLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  const cart = await getCart();

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const { t } = await getDictionary();

  const locale = await getLocale();

  const founding = await getFoundingClientState();

  const commercial = getCommercialContent(locale);



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

      <main id="main-content" className="flex-1">

        {children}

      </main>

      <Footer />

      <CookieBanner />

      <ChatProvider />

    </>

  );

}

