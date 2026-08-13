import type { Metadata } from "next";
import { PasswordResetRequestForm } from "@/components/auth/auth-forms";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { ServerLocaleLink } from "@/i18n/server-locale-link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.forgotTitle"),
    robots: { index: false },
  };
}

export default async function WachtwoordVergetenPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <h1 className="text-h2 mb-2 text-center">{t("auth.forgotTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.forgotIntro")}</p>
      <PasswordResetRequestForm />
      <p className="text-small text-muted text-center mt-4">
        <ServerLocaleLink href="/inloggen" className="text-primary hover:underline">
          {t("auth.backToLogin")}
        </ServerLocaleLink>
      </p>
    </MessagesProvider>
  );
}
