import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/auth/auth-forms";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.inviteTitle"),
    robots: { index: false },
  };
}

export default async function UitnodigingAccepterenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { t } = await getDictionary();

  if (!token || token.length < 32) {
    return (
      <>
        <h1 className="text-h2 mb-2 text-center">{t("auth.inviteInvalidTitle")}</h1>
        <p className="text-muted text-small text-center">{t("auth.inviteInvalidBody")}</p>
      </>
    );
  }

  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <h1 className="text-h2 mb-2 text-center">{t("auth.inviteTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.inviteIntro")}</p>
      <AcceptInvitationForm token={token} />
    </MessagesProvider>
  );
}
