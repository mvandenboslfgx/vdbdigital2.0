import type { Metadata } from "next";
import { Card, Container } from "@/components/ui/container";
import { MfaSetupForm } from "@/components/admin/mfa-setup-form";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";

export const metadata: Metadata = {
  title: "Set up MFA",
  robots: { index: false },
};

export default async function MfaSetupPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <Container className="max-w-md w-full">
      <Card>
        <h1 className="text-h2 mb-2">{t("mfa.setupTitle")}</h1>
        <p className="text-small text-muted mb-6">{t("mfa.setupIntro")}</p>
        <MessagesProvider locale={locale} messages={messages}>
          <MfaSetupForm />
        </MessagesProvider>
      </Card>
    </Container>
  );
}
