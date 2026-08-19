import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LocaleLink } from "@/i18n/locale-link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { BookingCta } from "@/components/commercial/booking-cta";

export interface SolutionPageSections {
  title: string;
  description: string;
  problem?: { title: string; body: string };
  builds?: { title: string; body: string };
  benefits: string[];
  features: string[];
  process?: string[];
  integrations?: string[];
  security?: string[];
  whoFor?: string[];
  included?: string[];
  notIncluded?: string[];
  extensions?: string[];
  faq?: Array<{ q: string; a: string }>;
  related?: Array<{ href: string; label: string }>;
  visual?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  /** Allowed when spreading getSolutionContent(); ignored by UI */
  metaTitle?: string;
  metaDescription?: string;
}

function ListBlock({
  title,
  items,
  light = true,
}: {
  title: string;
  items: string[];
  light?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className={`text-h2 mb-6 ${light ? "text-light-foreground" : ""}`}>{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className={`flex gap-3 text-small ${light ? "text-light-muted" : "text-muted"}`}
          >
            <span className="text-primary shrink-0" aria-hidden>
              ✓
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SolutionPageContent(props: SolutionPageSections) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const isNl = locale === "nl";
  const {
    title,
    description,
    problem,
    builds,
    benefits,
    features,
    process = [],
    integrations = [],
    security = [],
    whoFor = [],
    included = [],
    notIncluded = [],
    extensions = [],
    faq = [],
    related = [],
    visual,
    ctaHref = `${paths.contact}?intent=introduction`,
    ctaLabel,
  } = props;

  const resolvedCtaLabel = ctaLabel ?? t("nav.scheduleIntro");

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 min-w-0">
              <p className="text-label text-primary mb-3">{t("solution.eyebrow")}</p>
              <h1 className="text-h1 mb-4">{title}</h1>
              <p className="text-body-lg text-muted prose-width mb-8">{description}</p>
              <div className="flex flex-wrap gap-3">
                <LocaleLinkButton href={ctaHref} size="lg">
                  {resolvedCtaLabel}
                </LocaleLinkButton>
                <LocaleLinkButton href={paths.quote} variant="outline" size="lg">
                  {t("nav.quote")}
                </LocaleLinkButton>
                <LocaleLinkButton href={paths.solutions} variant="ghost" size="lg">
                  {t("home.ctaSolutions")}
                </LocaleLinkButton>
              </div>
            </div>
            {visual ? <div className="lg:col-span-5 min-w-0">{visual}</div> : null}
          </div>
        </Container>
      </Section>

      {problem ? (
        <Section variant="light">
          <Container className="max-w-3xl">
            <h2 className="text-h2 text-light-foreground mb-4">{problem.title}</h2>
            <p className="text-body text-light-muted">{problem.body}</p>
          </Container>
        </Section>
      ) : null}

      {builds ? (
        <Section variant="dark">
          <Container className="max-w-3xl">
            <h2 className="text-h2 mb-4">{builds.title}</h2>
            <p className="text-body text-muted">{builds.body}</p>
          </Container>
        </Section>
      ) : null}

      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-2 gap-10">
            <ListBlock
              title={t("solution.included")}
              items={features.length ? features : included}
            />
            <div>
              <h2 className="text-h2 text-light-foreground mb-6">{t("solution.benefits")}</h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <Card key={benefit} variant="light">
                    <p className="text-small text-light-muted">{benefit}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {(process.length > 0 || integrations.length > 0 || security.length > 0) && (
        <Section variant="dark">
          <Container>
            <div className="grid md:grid-cols-3 gap-10">
              {process.length > 0 ? (
                <ListBlock title={t("nav.process")} items={process} light={false} />
              ) : null}
              {integrations.length > 0 ? (
                <ListBlock
                  title={isNl ? "Integraties" : "Integrations"}
                  items={integrations}
                  light={false}
                />
              ) : null}
              {security.length > 0 ? (
                <ListBlock
                  title={isNl ? "Beveiliging & privacy" : "Security & privacy"}
                  items={security}
                  light={false}
                />
              ) : null}
            </div>
          </Container>
        </Section>
      )}

      {(whoFor.length > 0 || notIncluded.length > 0 || extensions.length > 0) && (
        <Section variant="light">
          <Container>
            <div className="grid md:grid-cols-3 gap-10">
              {whoFor.length > 0 ? (
                <ListBlock title={isNl ? "Voor wie" : "Who it is for"} items={whoFor} />
              ) : null}
              {notIncluded.length > 0 ? (
                <div>
                  <h2 className="text-h2 text-light-foreground mb-6">
                    {isNl ? "Niet inbegrepen" : "Not included"}
                  </h2>
                  <ul className="space-y-3">
                    {notIncluded.map((item) => (
                      <li key={item} className="flex gap-3 text-small text-light-muted">
                        <span className="text-muted shrink-0" aria-hidden>
                          —
                        </span>
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {extensions.length > 0 ? (
                <ListBlock
                  title={isNl ? "Uitbreidingen" : "Optional extensions"}
                  items={extensions}
                />
              ) : null}
            </div>
          </Container>
        </Section>
      )}

      {faq.length > 0 ? (
        <Section variant="dark">
          <Container className="max-w-3xl">
            <h2 className="text-h2 mb-8">{t("faq.title")}</h2>
            <dl className="space-y-6">
              {faq.map((item) => (
                <div key={item.q}>
                  <dt className="font-medium mb-2">{item.q}</dt>
                  <dd className="text-small text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section variant="light">
          <Container>
            <h2 className="text-h2 text-light-foreground mb-6">
              {isNl ? "Gerelateerde oplossingen" : "Related solutions"}
            </h2>
            <div className="flex flex-wrap gap-3">
              {related.map((item) => (
                <LocaleLink
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-light-border px-4 py-2.5 text-small text-light-foreground hover:border-primary hover:text-primary min-h-11 inline-flex items-center"
                >
                  {item.label}
                </LocaleLink>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section variant="dark">
        <Container className="text-center">
          <h2 className="text-h2 mb-4">
            {t("solution.interestTitle")}
          </h2>
          <p className="text-muted mb-6 prose-width mx-auto">{t("solution.interestBody")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <BookingCta variant="primary" />
            <LocaleLinkButton href={paths.quote} variant="outline" size="lg">
              {t("nav.quote")}
            </LocaleLinkButton>
            <LocaleLinkButton href={paths.cases} variant="ghost" size="lg">
              {t("cta.cases")}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}

export async function createSolutionMetadata(
  title: string,
  description: string,
  path: string,
): Promise<Metadata> {
  const locale = await getLocale();
  const pageTitle = title.replace(/\s*\|\s*VDB Digital Software\s*$/i, "").trim();

  return {
    title: pageTitle,
    description,
    alternates: buildLocaleAlternates(path, locale),
    openGraph: {
      title: pageTitle,
      description,
      locale: openGraphLocale(locale),
    },
  };
}
