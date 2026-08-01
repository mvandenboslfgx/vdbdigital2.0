import type { Metadata } from "next";
import { AccountRequestForm } from "@/components/auth/auth-forms";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { ServerLocaleLink } from "@/i18n/server-locale-link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.registerTitle"),
    robots: { index: false },
  };
}

export default async function AccountAanmakenPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <h1 className="text-h2 mb-2 text-center">{t("auth.registerTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.registerIntro")}</p>
      <AccountRequestForm />
      <p className="text-small text-muted text-center mt-4">
        {t("auth.registerHasAccount")}{" "}
        <ServerLocaleLink href="/inloggen" className="text-primary hover:underline">
          {t("auth.loginButton")}
        </ServerLocaleLink>
      </p>
    </MessagesProvider>
  );
}
