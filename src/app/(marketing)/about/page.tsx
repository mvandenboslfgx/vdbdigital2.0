import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { CtaSection } from "@/components/sections/cta-section";
import { BrandLink } from "@/components/brand/BrandLink";
import { CompanyLegalBlock } from "@/components/sections/company-legal-block";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("about.title"),
    description: t("meta.description"),
    alternates: { canonical: paths.about },
  };
}

export default async function AboutPage() {
  const { t } = await getDictionary();
  const name = siteConfig.name;

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <BrandLink variant="light" className="mb-8" logoClassName="h-12 w-auto" />
          <h1 className="text-h1 mb-4">
            {t("about.title")}
          </h1>
          <p className="text-body-lg text-muted prose-width">
            {t("about.intro", { name })}
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

      <Section variant="dark">
        <Container className="max-w-3xl space-y-10">
          <div>
            <h2 className="text-h2 mb-3">{t("about.who")}</h2>
            <p className="text-muted">{t("about.whoBody", { name })}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.why")}</h2>
            <p className="text-muted">{t("about.whyBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.collaboration")}</h2>
            <p className="text-muted">{t("about.collaborationBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.expertise")}</h2>
            <p className="text-muted">{t("about.expertiseBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.clients")}</h2>
            <p className="text-muted">{t("about.clientsBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.quality")}</h2>
            <p className="text-muted">{t("about.qualityBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.location")}</h2>
            <p className="text-muted">{t("about.locationBody")}</p>
          </div>
          <div>
            <h2 className="text-h2 mb-3">{t("about.meet")}</h2>
            <p className="text-muted mb-6">{t("about.meetBody")}</p>
            <LocaleLinkButton href={`${paths.contact}?intent=introduction`}>
              {t("nav.scheduleIntro")}
            </LocaleLinkButton>
          </div>
          <div>
            <h2 className="text-h3 mb-3">{t("footer.company")}</h2>
            <div className="text-small text-muted">
              <CompanyLegalBlock />
            </div>
          </div>
        </Container>
      </Section>

      <CtaSection />
    </>
  );
}
