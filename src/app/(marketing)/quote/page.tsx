import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Section, Card } from "@/components/ui/container";
import { QuoteForm } from "@/components/forms/quote-form";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { paths } from "@/i18n/config";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("forms.quoteTitle"),
    description: t("forms.quoteIntro"),
    alternates: buildLocaleAlternates(paths.quote, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function QuotePage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <h1 className="text-h1 mb-4">{t("forms.quoteTitle")}</h1>
          <p className="text-body-lg text-muted prose-width">{t("forms.quoteIntro")}</p>
        </Container>
      </Section>
      <Section variant="light">
        <Container className="max-w-2xl">
          <Card variant="light">
            <MessagesProvider locale={locale} messages={messages}>
              <Suspense
                fallback={
                  <p className="text-small text-light-muted">{t("forms.formLoading")}</p>
                }
              >
                <QuoteForm />
              </Suspense>
            </MessagesProvider>
          </Card>
          <div className="mt-6 text-center">
            <WhatsAppButton
              message={t("forms.whatsappMessageQuote")}
              label={t("forms.whatsapp")}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
