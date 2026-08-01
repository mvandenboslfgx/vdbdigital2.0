import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  getCaseLiveUrl,
  getCasesByPortfolioGroup,
  type CaseDefinition,
} from "@/config/commercial/cases";
import { paths } from "@/i18n/config";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
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
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("nav.cases"),
    description: t("cases.pageMetaDescription"),
    alternates: buildLocaleAlternates(paths.cases, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

type CaseCardCopy = {
  title: string;
  summary: string;
  label?: string;
  category?: string;
  viewCase?: string;
  openLive?: string;
  desktopAlt?: string;
  launchNote?: string;
};

function portfolioImage(item: CaseDefinition): string | null {
  if (!item.assetDir) return null;
  if (item.slug === "trustbooker") {
    return `/cases/${item.assetDir}/desktop-dashboard.webp`;
  }
  return `/cases/${item.assetDir}/desktop-home.webp`;
}

function PortfolioCard({
  item,
  copy,
  moreAboutLabel,
}: {
  item: CaseDefinition;
  copy: CaseCardCopy;
  moreAboutLabel: string;
}) {
  const liveUrl = getCaseLiveUrl(item);
  const isLive = item.launchStatus === "LIVE" && Boolean(liveUrl);
  const image = portfolioImage(item);

  return (
    <Card
      variant="light"
      className={cn(
        "group grid overflow-hidden p-0",
        image ? "md:grid-cols-2" : "",
      )}
    >
      {image ? (
        <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[280px] overflow-hidden">
          <Image
            src={image}
            alt={copy.desktopAlt ?? copy.title}
            width={1440}
            height={1100}
            className={cn(
              "h-full w-full object-cover object-top transition-transform duration-500",
              "motion-safe:group-hover:scale-[1.02]",
            )}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={item.sortOrder <= 20}
          />
        </div>
      ) : null}
      <div className="flex flex-col justify-center p-6 sm:p-8">
        {copy.label ? <Badge className="mb-3 w-fit">{copy.label}</Badge> : null}
        {copy.category ? (
          <p className="text-xs text-light-muted mb-2">{copy.category}</p>
        ) : null}
        <h3 className="text-h3 text-light-foreground mb-3">{copy.title}</h3>
        <p className="text-small text-light-muted mb-6">{copy.summary}</p>
        <div className="flex flex-wrap gap-3">
          <LocaleLinkButton href={`${paths.cases}/${item.slug}`}>
            {copy.viewCase ?? moreAboutLabel}
          </LocaleLinkButton>
          {isLive && liveUrl ? (
            <LinkButton
              href={liveUrl}
              external
              variant="outline"
              tone="light"
              className="inline-flex items-center gap-2"
              aria-label={`${copy.openLive ?? "Live"}: ${item.domainLabel}`}
            >
              {copy.openLive ?? "Live"}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          ) : copy.launchNote ? (
            <span className="inline-flex items-center rounded-md border border-border/60 px-3 py-2 text-sm text-light-muted">
              {copy.launchNote}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function resolveCaseCopy(
  commercial: ReturnType<typeof getCommercialContent>,
  item: CaseDefinition,
): CaseCardCopy {
  const raw = commercial[item.i18nKey as keyof typeof commercial];
  if (!raw || typeof raw !== "object") {
    return { title: item.slug, summary: "" };
  }
  const record = raw as Record<string, unknown>;
  return {
    title: typeof record.title === "string" ? record.title : item.slug,
    summary: typeof record.summary === "string" ? record.summary : "",
    label: typeof record.label === "string" ? record.label : undefined,
    category: typeof record.category === "string" ? record.category : undefined,
    viewCase: typeof record.viewCase === "string" ? record.viewCase : undefined,
    openLive: typeof record.openLive === "string" ? record.openLive : undefined,
    desktopAlt:
      typeof record.desktopAlt === "string" ? record.desktopAlt : undefined,
    launchNote:
      typeof record.launchNote === "string" ? record.launchNote : undefined,
  };
}

export default async function CasesPage() {
  const { t } = await getDictionary();
  const locale = await getLocale();
  const commercial = getCommercialContent(locale);
  const groups = getCasesByPortfolioGroup();
  const moreAbout = t("cases.moreAbout");

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

      {groups.client.length > 0 ? (
        <Section variant="light">
          <Container>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("cases.groupClient")}
            </h2>
            <div className="space-y-8">
              {groups.client.map((item) => (
                <PortfolioCard
                  key={item.slug}
                  item={item}
                  copy={resolveCaseCopy(commercial, item)}
                  moreAboutLabel={moreAbout}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {groups.own.length > 0 ? (
        <Section variant="light">
          <Container>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("cases.groupOwn")}
            </h2>
            <div className="space-y-8">
              {groups.own.map((item) => (
                <PortfolioCard
                  key={item.slug}
                  item={item}
                  copy={resolveCaseCopy(commercial, item)}
                  moreAboutLabel={moreAbout}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section variant="light">
        <Container>
          <h2 className="text-h2 text-light-foreground mb-3">
            {t("cases.groupConcepts")}
          </h2>
          <p className="text-small text-light-muted mb-8 prose-width">
            {t("cases.groupConceptsIntro")}
          </p>

          {groups.concepts.length > 0 ? (
            <div className="space-y-8 mb-10">
              {groups.concepts.map((item) => (
                <PortfolioCard
                  key={item.slug}
                  item={item}
                  copy={resolveCaseCopy(commercial, item)}
                  moreAboutLabel={moreAbout}
                />
              ))}
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-6">
            {caseTypes.map((item) => (
              <Card key={item.slug} variant="light">
                <p className="text-label text-light-muted mb-2">
                  {t(`cases.item${item.key}Type`)} ·{" "}
                  {t(`cases.item${item.key}Focus`)}
                </p>
                <h3 className="text-h3 text-light-foreground mb-2">
                  {t(`cases.item${item.key}Title`)}
                </h3>
                <p className="text-small text-light-muted mb-4">
                  {t(`cases.item${item.key}Summary`)}
                </p>
                <LocaleLinkButton
                  href={`${paths.cases}/${item.slug}`}
                  variant="outline"
                  tone="light"
                  size="sm"
                >
                  {t("cases.moreAbout")}
                </LocaleLinkButton>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
