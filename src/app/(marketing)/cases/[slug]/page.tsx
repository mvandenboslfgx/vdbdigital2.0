import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  caseCatalog,
  getCaseBySlug,
  isCasePubliclyVisible,
  isCaseSearchIndexable,
} from "@/config/commercial/cases";
import { paths } from "@/i18n/config";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";
import { AutomationFlowVisual } from "@/components/visuals/automation-flow-visual";
import { VermeulenCasePage } from "@/components/cases/vermeulen-case-page";
import { GrillGastenCasePage } from "@/components/cases/grill-gasten-case-page";
import { TrustbookerCasePage } from "@/components/cases/trustbooker-case-page";
import { resolveAppUrl } from "@/lib/url/app-url";

const legacySlugs = {
  "conversie-website": "ConversionWebsite",
  "premium-webshop": "PremiumWebshop",
  "whatsapp-automatisering": "WhatsappAutomation",
  "reviewflow-setup": "ReviewflowSetup",
} as const;

interface CasePageProps {
  params: Promise<{ slug: string }>;
}

function caseTypeLabel(
  type: string,
  labels: ReturnType<typeof getCommercialContent>["caseLabel"],
): string {
  if (type === "demonstration") return labels.demonstration;
  if (type === "internal") return labels.internal;
  if (type === "real") return labels.real;
  return labels.draft;
}

export async function generateStaticParams() {
  return caseCatalog
    .filter((c) => isCasePubliclyVisible(c.slug))
    .map((c) => ({ slug: c.slug }))
    .concat(Object.keys(legacySlugs).map((slug) => ({ slug })));
}

export async function generateMetadata({
  params,
}: CasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getDictionary();
  const commercial = getCaseBySlug(slug);
  const base = resolveAppUrl().replace(/\/$/, "");
  const locale = await getLocale();
  const content = getCommercialContent(locale);

  if (
    commercial?.slug === "vermeulen-bouwservice" ||
    commercial?.slug === "grill-gasten" ||
    commercial?.slug === "trustbooker"
  ) {
    const copy = content[commercial.i18nKey as "vermeulen" | "grillGasten" | "trustbooker"];
    const asset =
      commercial.slug === "trustbooker"
        ? "desktop-dashboard.webp"
        : "desktop-home.webp";
    const ogImage = `${base}/cases/${commercial.assetDir}/${asset}`;
    const indexable = isCaseSearchIndexable(commercial);

    return {
      title: copy.seoTitle,
      description: copy.seoDescription,
      alternates: { canonical: `${paths.cases}/${slug}` },
      openGraph: {
        title: copy.seoTitle,
        description: copy.seoDescription,
        images: [{ url: ogImage, width: 1440, height: 1100 }],
        type: "article",
      },
      robots: { index: indexable, follow: true },
    };
  }

  if (commercial) {
    const copy = content[commercial.i18nKey as "demoWhatsapp"];
    return {
      title: copy.title,
      description: copy.summary,
      alternates: { canonical: `${paths.cases}/${slug}` },
    };
  }
  const key = legacySlugs[slug as keyof typeof legacySlugs];
  if (!key) return { title: t("cases.notFound") };
  return {
    title: t(`cases.item${key}Title`),
    description: t(`cases.detail${key}Content`).slice(0, 160),
    alternates: { canonical: `${paths.cases}/${slug}` },
  };
}

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary();
  const c = getCommercialContent(locale);

  const commercial = getCaseBySlug(slug);
  if (commercial) {
    if (!isCasePubliclyVisible(slug)) notFound();

    if (commercial.slug === "vermeulen-bouwservice") {
      return <VermeulenCasePage locale={locale} copy={c.vermeulen} />;
    }
    if (commercial.slug === "grill-gasten") {
      return <GrillGastenCasePage locale={locale} copy={c.grillGasten} />;
    }
    if (commercial.slug === "trustbooker") {
      return <TrustbookerCasePage locale={locale} copy={c.trustbooker} />;
    }

    const copy = c[commercial.i18nKey as keyof typeof c] as {
      title: string;
      summary: string;
      step1?: string;
      step2?: string;
      step3?: string;
    };

    return (
      <>
        <Section variant="dark" className="pt-12">
          <Container>
            <Badge className="mb-4">
              {caseTypeLabel(commercial.type, c.caseLabel)}
            </Badge>
            <h1 className="text-h1 mb-4">{copy.title}</h1>
            <p className="text-body-lg text-muted prose-width">{copy.summary}</p>
          </Container>
        </Section>
        <Section variant="light">
          <Container className="max-w-2xl">
            {commercial.i18nKey === "demoWhatsapp" && copy.step1 ? (
              <WhatsAppAiChatVisual
                title={copy.title}
                steps={[
                  { label: copy.step1 },
                  { label: copy.step2! },
                  { label: copy.step3! },
                ]}
              />
            ) : null}
            {commercial.i18nKey === "demoWebshop" && copy.step1 ? (
              <AutomationFlowVisual
                title={copy.title}
                steps={[copy.step1, copy.step2!, copy.step3!]}
              />
            ) : null}
            {commercial.i18nKey === "demoReview" && copy.step1 ? (
              <AutomationFlowVisual
                title={copy.title}
                steps={[copy.step1, copy.step2!, copy.step3!]}
              />
            ) : null}
            {commercial.i18nKey === "platform" ? (
              <Card variant="light">
                <p className="text-light-muted text-small">
                  {locale === "nl"
                    ? "Dit platform is intern gebouwd door VDB Digital Software — geen verzonnen klantresultaten."
                    : "This platform is built in-house by VDB Digital Software — no fabricated client results."}
                </p>
              </Card>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <LocaleLinkButton href={`${paths.contact}?intent=introduction`}>
                {t("nav.scheduleIntro")}
              </LocaleLinkButton>
              <LocaleLinkButton href={paths.quote} variant="outline">
                {t("nav.quote")}
              </LocaleLinkButton>
            </div>
          </Container>
        </Section>
      </>
    );
  }

  const key = legacySlugs[slug as keyof typeof legacySlugs];
  if (!key) notFound();

  const outcomes = [
    t(`cases.detail${key}Outcome1`),
    t(`cases.detail${key}Outcome2`),
    t(`cases.detail${key}Outcome3`),
  ];

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <p className="text-label text-primary mb-3">
            {t(`cases.item${key}Type`)} · {t(`cases.item${key}Focus`)}
          </p>
          <h1 className="text-h1 mb-4">{t(`cases.item${key}Title`)}</h1>
          <p className="text-body-lg text-muted prose-width">
            {t(`cases.detail${key}Content`)}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-h2 text-light-foreground mb-4">
                {t("cases.whatItSolves")}
              </h2>
              <ul className="space-y-3 text-light-muted">
                {outcomes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card variant="light">
              <h2 className="text-h3 text-light-foreground mb-3">
                {t("cases.interestTitle")}
              </h2>
              <p className="text-small text-light-muted mb-5">
                {t("cases.interestBody")}
              </p>
              <div className="space-y-2">
                <LocaleLinkButton href={paths.quote} className="w-full">
                  {t("nav.quote")}
                </LocaleLinkButton>
                <LocaleLinkButton
                  href={paths.contact}
                  variant="outline"
                  className="w-full"
                >
                  {t("nav.contact")}
                </LocaleLinkButton>
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
