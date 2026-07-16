import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Section, Card } from "@/components/ui/container";
import { QuoteForm } from "@/components/forms/quote-form";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("forms.quoteTitle"),
    description: t("forms.quoteIntro"),
    alternates: { canonical: paths.quote },
  };
}

export default async function QuotePage() {
  const { t } = await getDictionary();

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
            <Suspense
              fallback={<p className="text-small text-light-muted">{t("forms.formLoading")}</p>}
            >
              <QuoteForm />
            </Suspense>
          </Card>
          <div className="mt-6 text-center">
            <WhatsAppButton message={t("forms.whatsappMessageQuote")} />
          </div>
        </Container>
      </Section>
    </>
  );
}
