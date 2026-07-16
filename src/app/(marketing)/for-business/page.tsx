import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("forBusiness.title"),
    description: t("forBusiness.intro"),
    alternates: { canonical: paths.forBusiness },
  };
}

export default async function ForBusinessPage() {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.forBusiness")}</p>
          <h1 className="text-h1 mb-4">{t("forBusiness.title")}</h1>
          <p className="text-body-lg text-muted prose-width">
            {t("forBusiness.intro")}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: t("pillars.build"),
                body: t("pillars.buildBody"),
              },
              {
                title: t("pillars.automate"),
                body: t("pillars.automateBody"),
              },
              {
                title: t("pillars.grow"),
                body: t("pillars.growBody"),
              },
            ].map((item) => (
              <Card key={item.title} variant="light">
                <h2 className="text-h3 text-light-foreground mb-3">{item.title}</h2>
                <p className="text-small text-light-muted">{item.body}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <LocaleLinkButton href={paths.quote} size="lg">
              {t("forBusiness.ctaQuote")}
            </LocaleLinkButton>
            <LocaleLinkButton href={paths.solutions} variant="outline" size="lg">
              {t("forBusiness.ctaSolutions")}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
