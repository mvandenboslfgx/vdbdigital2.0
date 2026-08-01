import type { Metadata } from "next";
import { PasswordUpdateForm } from "@/components/auth/auth-forms";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.resetTitle"),
    robots: { index: false },
  };
}

export default async function WachtwoordHerstellenPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <h1 className="text-h2 mb-2 text-center">{t("auth.resetTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.resetIntro")}</p>
      <PasswordUpdateForm />
    </MessagesProvider>
  );
}
