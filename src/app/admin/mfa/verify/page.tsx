import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/container";
import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";
import { getMfaStatus } from "@/server/auth/mfa-status";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Verify MFA",
  robots: { index: false },
};

export default async function MfaVerifyPage() {
  const locale = await getLocale();
  const mfa = await getMfaStatus();
  if (!mfa?.hasVerifiedFactor) {
    redirect(withLocale("/admin/mfa/setup", locale));
  }

  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <Container className="max-w-md w-full">
      <Card>
        <h1 className="text-h2 mb-2">{t("mfa.challengeTitle")}</h1>
        <MessagesProvider locale={locale} messages={messages}>
          <MfaVerifyForm />
        </MessagesProvider>
      </Card>
    </Container>
  );
}
