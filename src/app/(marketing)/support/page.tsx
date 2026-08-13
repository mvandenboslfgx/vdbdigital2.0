import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { SupportForm } from "@/components/forms/support-form";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { CarePackagesSection } from "@/components/sections/care-packages-section";
import { siteConfig } from "@/config/site";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { paths } from "@/i18n/config";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("forms.supportTitle"),
    description: t("forms.supportIntro"),
    alternates: buildLocaleAlternates(paths.support, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function SupportPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <h1 className="text-h1 mb-4">{t("forms.supportTitle")}</h1>
          <p className="text-body-lg text-muted prose-width">{t("forms.supportPageIntro")}</p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-2 gap-10">
            <Card variant="light">
              <MessagesProvider locale={locale} messages={messages}>
                <SupportForm />
              </MessagesProvider>
            </Card>
            <div className="space-y-6">
              <Card variant="light">
                <h2 className="text-h3 text-light-foreground mb-2">{t("forms.supportEmail")}</h2>
                <p className="text-light-muted">{siteConfig.supportEmail}</p>
              </Card>
              <WhatsAppButton
                message={t("forms.whatsappMessageSupport")}
                label={t("forms.whatsapp")}
              />
            </div>
          </div>
        </Container>
      </Section>
      <CarePackagesSection />
    </>
  );
}
