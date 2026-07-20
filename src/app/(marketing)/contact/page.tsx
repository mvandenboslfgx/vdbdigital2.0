import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { ContactForm } from "@/components/forms/contact-form";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { CompanyLegalBlock } from "@/components/sections/company-legal-block";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("forms.contactTitle"),
    description: t("forms.contactIntro"),
    alternates: { canonical: paths.contact },
  };
}

export default async function ContactPage() {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <h1 className="text-h1 mb-4">{t("forms.contactTitle")}</h1>
          <p className="text-body-lg text-muted prose-width">
            {t("forms.contactIntro")}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-2 gap-10">
            <Card variant="light">
              <ContactForm />
            </Card>
            <div className="space-y-8">
              <div>
                <h2 className="text-h3 text-light-foreground mb-3">
                  {t("forms.directContact")}
                </h2>
                <dl className="space-y-3 text-small">
                  <div>
                    <dt className="text-light-muted">{t("common.email")}</dt>
                    <dd>
                      <a
                        href={`mailto:${siteConfig.contactEmail}`}
                        className="text-light-foreground hover:text-primary transition-colors"
                      >
                        {siteConfig.contactEmail}
                      </a>
                    </dd>
                  </div>
                  {siteConfig.company.phone ? (
                    <div>
                      <dt className="text-light-muted">{t("common.phone")}</dt>
                      <dd>
                        <a
                          href={`tel:${siteConfig.company.phone.replace(/\s/g, "")}`}
                          className="text-light-foreground hover:text-primary transition-colors"
                        >
                          {siteConfig.company.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {siteConfig.supportEmail ? (
                    <div>
                      <dt className="text-light-muted">{t("nav.support")}</dt>
                      <dd>
                        <a
                          href={`mailto:${siteConfig.supportEmail}`}
                          className="text-light-foreground hover:text-primary transition-colors"
                        >
                          {siteConfig.supportEmail}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div>
                <h2 className="text-h3 text-light-foreground mb-3">
                  {t("footer.company")}
                </h2>
                <div className="text-small text-light-muted">
                  <CompanyLegalBlock />
                </div>
              </div>
              <div>
                <h2 className="text-h3 text-light-foreground mb-3">
                  {t("forms.whatsapp")}
                </h2>
                <WhatsAppButton message={t("forms.whatsappMessageContact")} />
              </div>
              <div>
                <h2 className="text-h3 text-light-foreground mb-3">
                  {t("forms.preferQuote")}
                </h2>
                <p className="text-small text-light-muted mb-3">
                  {t("forms.preferQuoteBody")}
                </p>
                <LocaleLink
                  href={paths.quote}
                  className="text-small font-medium text-primary hover:underline"
                >
                  {t("forms.toQuoteForm")}
                </LocaleLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
