import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { CasesSection } from "@/components/sections/cases-section";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export const caseTypes = [
  {
    slug: "conversie-website",
    key: "ConversionWebsite",
  },
  {
    slug: "premium-webshop",
    key: "PremiumWebshop",
  },
  {
    slug: "whatsapp-automatisering",
    key: "WhatsappAutomation",
  },
  {
    slug: "reviewflow-setup",
    key: "ReviewflowSetup",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("nav.cases"),
    description: t("cases.pageMetaDescription"),
    alternates: { canonical: paths.cases },
  };
}

export default async function CasesPage() {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.cases")}</p>
          <h1 className="text-h1 mb-4">{t("cases.pageTitle")}</h1>
          <p className="text-body-lg text-muted prose-width">{t("cases.pageIntro")}</p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid sm:grid-cols-2 gap-6">
            {caseTypes.map((c) => (
              <Card key={c.slug} variant="light">
                <p className="text-label text-light-muted mb-2">
                  {t(`cases.item${c.key}Type`)} · {t(`cases.item${c.key}Focus`)}
                </p>
                <h2 className="text-h3 text-light-foreground mb-2">
                  {t(`cases.item${c.key}Title`)}
                </h2>
                <p className="text-small text-light-muted mb-4">
                  {t(`cases.item${c.key}Summary`)}
                </p>
                <LocaleLinkButton href={`${paths.cases}/${c.slug}`} variant="outline" size="sm">
                  {t("cases.moreAbout")}
                </LocaleLinkButton>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <CasesSection />
    </>
  );
}
