import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleLink } from "@/i18n/locale-link";
import { CaseWebsitePreview } from "@/components/visuals/site-browser-preview";
import { paths } from "@/i18n/config";
import type { CaseLaunchStatus } from "@/config/commercial/cases";

export type PortfolioCaseCopy = {
  label: string;
  title: string;
  summary: string;
  featuredIntro: string;
  category: string;
  heroSubtitle: string;
  about: string;
  goalsTitle: string;
  goals: readonly string[];
  solutionTitle: string;
  solutions: readonly string[];
  tags: readonly string[];
  details: {
    client: string;
    industry: string;
    type: string;
    status: string;
    website: string;
  };
  detailsTitle: string;
  previewTitle: string;
  ctaTitle: string;
  viewCase: string;
  openLive: string;
  openLiveHint: string;
  liveBadge: string;
  launchNote?: string;
  desktopAlt: string;
  mobileAlt: string;
  fullPageAlt: string;
  menuAlt?: string;
  relatedService: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
};

type PortfolioCasePageProps = {
  locale: "en" | "nl";
  copy: PortfolioCaseCopy;
  assetDir: string;
  domainLabel: string;
  launchStatus: CaseLaunchStatus;
  liveUrl: string | null;
  caseHref: string;
  desktopFile?: string;
  mobileFile?: string;
  galleryFile?: string;
  showLiveButtons?: boolean;
  discussHref?: string;
  discussLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
};

export function PortfolioCasePage({
  locale,
  copy,
  assetDir,
  domainLabel,
  launchStatus,
  liveUrl,
  caseHref,
  desktopFile = "desktop-home.webp",
  mobileFile = "mobile-home.webp",
  galleryFile,
  showLiveButtons = launchStatus === "LIVE" && Boolean(liveUrl),
  discussHref = `${paths.contact}?intent=introduction`,
  discussLabel,
  secondaryCtaHref = paths.quote,
  secondaryCtaLabel,
}: PortfolioCasePageProps) {
  const aboutTitle = locale === "nl" ? "Over het project" : "About the project";
  const discuss =
    discussLabel ??
    (locale === "nl" ? "Bespreek jouw website" : "Discuss your website");
  const secondary =
    secondaryCtaLabel ??
    (locale === "nl" ? "Offerte aanvragen" : "Request a quote");
  const softwareDiscuss =
    locale === "nl"
      ? "Softwareproject bespreken"
      : "Discuss a software project";
  const contactLabel =
    locale === "nl" ? "Contact opnemen" : "Get in touch";

  const isComingSoon =
    launchStatus === "COMING_SOON" || launchStatus === "IN_DEVELOPMENT";
  const primaryDiscuss = isComingSoon ? softwareDiscuss : discuss;
  const secondaryLabel = isComingSoon ? contactLabel : secondary;
  const secondaryHref = isComingSoon
    ? `${paths.contact}?intent=software`
    : secondaryCtaHref;

  const desktopSrc = `/cases/${assetDir}/${desktopFile}`;
  const mobileSrc = `/cases/${assetDir}/${mobileFile}`;
  const gallerySrc = galleryFile
    ? `/cases/${assetDir}/${galleryFile}`
    : null;

  return (
    <>
      <Section variant="dark" className="pt-12 overflow-hidden">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Badge className="mb-4 w-fit">{copy.label}</Badge>
              <h1 className="text-h1 mb-4 text-balance">{copy.title}</h1>
              <p className="text-body-lg text-muted mb-8 max-w-xl">
                {copy.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {showLiveButtons && liveUrl ? (
                  <LinkButton
                    href={liveUrl}
                    external
                    className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    aria-label={`${copy.openLive}: ${domainLabel}`}
                  >
                    {copy.openLive}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </LinkButton>
                ) : null}
                {isComingSoon && copy.launchNote ? (
                  <span className="inline-flex items-center justify-center rounded-md border border-border/70 px-4 py-2 text-sm text-muted">
                    {copy.launchNote}
                  </span>
                ) : null}
                <LocaleLinkButton
                  href={discussHref}
                  variant={showLiveButtons ? "outline" : "primary"}
                  className="w-full sm:w-auto"
                >
                  {primaryDiscuss}
                </LocaleLinkButton>
              </div>
            </div>
            <CaseWebsitePreview
              desktopSrc={desktopSrc}
              mobileSrc={mobileSrc}
              desktopAlt={copy.desktopAlt}
              mobileAlt={copy.mobileAlt}
              address={domainLabel}
              statusLabel={copy.liveBadge}
              openHint={
                showLiveButtons ? copy.openLiveHint : copy.openLiveHint
              }
              size="hero"
              liveUrl={liveUrl}
              externalLinkEnabled={showLiveButtons}
              internalHref={isComingSoon ? caseHref : null}
              launchStatus={launchStatus}
            />
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="max-w-3xl">
          <h2 className="text-h2 text-light-foreground mb-4">{aboutTitle}</h2>
          <p className="text-light-muted text-body-lg">{copy.about}</p>
        </Container>
      </Section>

      <Section variant="dark">
        <Container>
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-h2 mb-5">{copy.goalsTitle}</h2>
              <ul className="space-y-3 text-muted">
                {copy.goals.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-h2 mb-5">{copy.solutionTitle}</h2>
              <ul className="space-y-3 text-muted">
                {copy.solutions.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container>
          <h2 className="text-h2 text-light-foreground mb-8">
            {copy.previewTitle}
          </h2>
          <div className="grid gap-8 lg:grid-cols-5 items-start">
            <div className="lg:col-span-3">
              <CaseWebsitePreview
                desktopSrc={desktopSrc}
                mobileSrc={mobileSrc}
                desktopAlt={copy.desktopAlt}
                mobileAlt={copy.mobileAlt}
                address={domainLabel}
                statusLabel={copy.liveBadge}
                openHint={copy.openLiveHint}
                liveUrl={liveUrl}
                externalLinkEnabled={showLiveButtons}
                internalHref={isComingSoon ? caseHref : null}
                launchStatus={launchStatus}
              />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {gallerySrc ? (
                <div className="overflow-hidden rounded-xl border border-border/60 shadow-lg">
                  <Image
                    src={gallerySrc}
                    alt={copy.fullPageAlt}
                    width={1440}
                    height={2200}
                    className="h-auto w-full object-cover object-top max-h-[520px]"
                    sizes="(max-width: 1024px) 100vw, 420px"
                  />
                </div>
              ) : null}
              {showLiveButtons && liveUrl ? (
                <LinkButton
                  href={liveUrl}
                  external
                  variant="outline"
                  tone="light"
                  className="w-full inline-flex items-center justify-center gap-2"
                  aria-label={`${copy.openLive}: ${domainLabel}`}
                >
                  {copy.openLive}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </LinkButton>
              ) : isComingSoon && copy.launchNote ? (
                <p className="text-center text-small text-light-muted">
                  {copy.launchNote}
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      <Section variant="dark">
        <Container>
          <h2 className="text-h2 mb-6">{copy.detailsTitle}</h2>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(
              [
                [locale === "nl" ? "Klant" : "Client", copy.details.client],
                [
                  locale === "nl" ? "Branche" : "Industry",
                  copy.details.industry,
                ],
                [locale === "nl" ? "Type" : "Type", copy.details.type],
                [locale === "nl" ? "Status" : "Status", copy.details.status],
                [
                  locale === "nl" ? "Website" : "Website",
                  copy.details.website,
                ],
              ] as const
            ).map(([label, value]) => (
              <Card key={label} className="bg-surface-elevated/50">
                <dt className="text-label text-muted mb-1">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </Card>
            ))}
          </dl>
          <p className="mt-8 text-small text-muted">
            <LocaleLink
              href={paths.websites}
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {copy.relatedService}
            </LocaleLink>
          </p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="max-w-2xl text-center">
          <h2 className="text-h2 text-light-foreground mb-6 text-balance">
            {copy.ctaTitle}
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <LocaleLinkButton
              href={discussHref}
              className="w-full sm:w-auto"
            >
              {primaryDiscuss}
            </LocaleLinkButton>
            <LocaleLinkButton
              href={secondaryHref}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {secondaryLabel}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
