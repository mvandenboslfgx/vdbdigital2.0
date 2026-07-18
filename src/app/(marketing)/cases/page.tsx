import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { CasesSection } from "@/components/sections/cases-section";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { isCasePubliclyVisible } from "@/config/commercial/cases";
import { paths } from "@/i18n/config";
import { VERMEULEN_LIVE_URL } from "@/components/visuals/site-browser-preview";
import { cn } from "@/lib/utilities/cn";

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
  const locale = await getLocale();
  const c = getCommercialContent(locale);
  const showVermeulen = isCasePubliclyVisible("vermeulen-bouwservice");

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.cases")}</p>
          <h1 className="text-h1 mb-4">{t("cases.pageTitle")}</h1>
          <p className="text-body-lg text-muted prose-width">
            {t("cases.pageIntro")}
          </p>
        </Container>
      </Section>

      {showVermeulen ? (
        <Section variant="light">
          <Container>
            <h2 className="text-h2 text-light-foreground mb-6">
              {locale === "nl" ? "Live klantcase" : "Live client case"}
            </h2>
            <Card
              variant="light"
              className="group grid overflow-hidden p-0 md:grid-cols-2"
            >
              <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[280px] overflow-hidden">
                <Image
                  src="/cases/vermeulen-bouwservice/desktop-home.webp"
                  alt={c.vermeulen.desktopAlt}
                  width={1440}
                  height={1100}
                  className={cn(
                    "h-full w-full object-cover object-top transition-transform duration-500",
                    "motion-safe:group-hover:scale-[1.02]",
                  )}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <Badge className="mb-3 w-fit">{c.vermeulen.label}</Badge>
                <p className="text-xs text-light-muted mb-2">
                  {c.vermeulen.details.type}
                </p>
                <h3 className="text-h3 text-light-foreground mb-3">
                  {c.vermeulen.title}
                </h3>
                <p className="text-small text-light-muted mb-6">
                  {c.vermeulen.summary}
                </p>
                <div className="flex flex-wrap gap-3">
                  <LocaleLinkButton
                    href={`${paths.cases}/vermeulen-bouwservice`}
                  >
                    {locale === "nl" ? "Bekijk case" : "View case"}
                  </LocaleLinkButton>
                  <LinkButton
                    href={VERMEULEN_LIVE_URL}
                    external
                    variant="outline"
                    className="inline-flex items-center gap-2"
                  >
                    {c.vermeulen.openLive}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </LinkButton>
                </div>
              </div>
            </Card>
          </Container>
        </Section>
      ) : null}

      <Section variant="light">
        <Container>
          <div className="grid sm:grid-cols-2 gap-6">
            {caseTypes.map((item) => (
              <Card key={item.slug} variant="light">
                <p className="text-label text-light-muted mb-2">
                  {t(`cases.item${item.key}Type`)} ·{" "}
                  {t(`cases.item${item.key}Focus`)}
                </p>
                <h2 className="text-h3 text-light-foreground mb-2">
                  {t(`cases.item${item.key}Title`)}
                </h2>
                <p className="text-small text-light-muted mb-4">
                  {t(`cases.item${item.key}Summary`)}
                </p>
                <LocaleLinkButton
                  href={`${paths.cases}/${item.slug}`}
                  variant="outline"
                  size="sm"
                >
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
