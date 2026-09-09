import { Container, Section } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { siteConfig } from "@/config/site";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";

/**
 * Short homepage "Over ons" teaser — links through to the full /about page
 * rather than duplicating it.
 */
export async function AboutTeaserSection() {
  const { t } = await getDictionary();
  const name = siteConfig.name;

  return (
    <Section variant="dark">
      <Container className="max-w-3xl">
        <p className="text-label text-primary mb-3">{t("home.aboutEyebrow")}</p>
        <h2 className="text-h2 mb-4">{t("home.aboutTitle")}</h2>
        <p className="text-body-lg text-muted mb-4">
          {t("home.aboutBody1", { name })}
        </p>
        <p className="text-body-lg text-muted mb-8">{t("home.aboutBody2")}</p>
        <LocaleLinkButton href={paths.about} variant="outline">
          {t("home.aboutCta")}
        </LocaleLinkButton>
      </Container>
    </Section>
  );
}
