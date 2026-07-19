import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { CtaSection } from "@/components/sections/cta-section";
import { BrandLink } from "@/components/brand/BrandLink";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("about.title", { name: siteConfig.name }),
    description: t("meta.description"),
    alternates: { canonical: paths.about },
  };
}

export default async function AboutPage() {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <BrandLink variant="light" className="mb-8" logoClassName="h-12 w-auto" />
          <h1 className="text-h1 mb-4">
            {t("about.title", { name: siteConfig.name })}
          </h1>
          <p className="text-body-lg text-muted prose-width">
            {t("about.intro", { name: siteConfig.name })}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="light">
              <h2 className="text-h3 text-light-foreground mb-3">{t("about.mission")}</h2>
              <p className="text-light-muted text-small">{t("about.missionBody")}</p>
            </Card>
            <Card variant="light">
              <h2 className="text-h3 text-light-foreground mb-3">{t("about.focus")}</h2>
              <p className="text-light-muted text-small">{t("about.focusBody")}</p>
            </Card>
            <Card variant="light">
              <h2 className="text-h3 text-light-foreground mb-3">{t("about.approach")}</h2>
              <p className="text-light-muted text-small">{t("about.approachBody")}</p>
            </Card>
          </div>
        </Container>
      </Section>
      <CtaSection />
    </>
  );
}
