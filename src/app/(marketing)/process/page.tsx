import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/container";
import { ProcessSection } from "@/components/sections/process-section";
import { CtaSection } from "@/components/sections/cta-section";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("process.title"),
    description: t("process.intro"),
    alternates: buildLocaleAlternates(paths.process, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function ProcessPage() {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <h1 className="text-h1 mb-4">{t("process.title")}</h1>
          <p className="text-body-lg text-muted prose-width">{t("process.intro")}</p>
        </Container>
      </Section>
      <ProcessSection />
      <Section variant="light">
        <Container className="max-w-3xl">
          <h2 className="text-h2 text-light-foreground mb-6">
            {t("process.expectTitle")}
          </h2>
          <ul className="space-y-4 text-light-muted">
            <li>{t("process.expect1")}</li>
            <li>{t("process.expect2")}</li>
            <li>{t("process.expect3")}</li>
            <li>{t("process.expect4")}</li>
            <li>{t("process.expect5")}</li>
          </ul>
        </Container>
      </Section>
      <CtaSection />
    </>
  );
}
