import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleLink } from "@/i18n/locale-link";
import {
  SiteBrowserPreview,
  VERMEULEN_LIVE_URL,
} from "@/components/visuals/site-browser-preview";
import { paths } from "@/i18n/config";
import type { getCommercialContent } from "@/i18n/content/commercial";

type VermeulenCopy = ReturnType<typeof getCommercialContent>["vermeulen"];

export function VermeulenCasePage({
  locale,
  copy,
}: {
  locale: "en" | "nl";
  copy: VermeulenCopy;
}) {
  const aboutTitle = locale === "nl" ? "Over het bedrijf" : "About the company";
  const caseLabel = locale === "nl" ? "Klantcase" : "Client case";
  const discussLabel =
    locale === "nl" ? "Bespreek uw website" : "Discuss your website";
  const quoteLabel = locale === "nl" ? "Offerte aanvragen" : "Request a quote";

  return (
    <>
      <Section variant="dark" className="pt-12 overflow-hidden">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-label text-primary mb-3">{caseLabel}</p>
              <Badge className="mb-4 w-fit">{copy.label}</Badge>
              <h1 className="text-h1 mb-4 text-balance">{copy.title}</h1>
              <p className="text-body-lg text-muted mb-8 max-w-xl">
                {copy.heroSubtitle}
              </p>
              <LinkButton
                href={VERMEULEN_LIVE_URL}
                external
                className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {copy.openLive}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
            </div>
            <SiteBrowserPreview
              desktopSrc="/cases/vermeulen-bouwservice/desktop-home.webp"
              mobileSrc="/cases/vermeulen-bouwservice/mobile-home.webp"
              desktopAlt={copy.desktopAlt}
              mobileAlt={copy.mobileAlt}
              address="vermeulenbouwservice.nl"
              liveLabel={copy.liveBadge}
              openHint={copy.openLiveHint}
              size="hero"
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
              <SiteBrowserPreview
                desktopSrc="/cases/vermeulen-bouwservice/desktop-home.webp"
                mobileSrc="/cases/vermeulen-bouwservice/mobile-home.webp"
                desktopAlt={copy.desktopAlt}
                mobileAlt={copy.mobileAlt}
                address="vermeulenbouwservice.nl"
                liveLabel={copy.liveBadge}
                openHint={copy.openLiveHint}
              />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-hidden rounded-xl border border-border/60 shadow-lg">
                <Image
                  src="/cases/vermeulen-bouwservice/full-page.webp"
                  alt={copy.fullPageAlt}
                  width={1440}
                  height={2200}
                  className="h-auto w-full object-cover object-top max-h-[520px]"
                  sizes="(max-width: 1024px) 100vw, 420px"
                />
              </div>
              <LinkButton
                href={VERMEULEN_LIVE_URL}
                external
                variant="outline"
                className="w-full inline-flex items-center justify-center gap-2"
              >
                {copy.openLive}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
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
                [locale === "nl" ? "Website" : "Website", copy.details.website],
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
              href={`${paths.contact}?intent=introduction`}
              className="w-full sm:w-auto"
            >
              {discussLabel}
            </LocaleLinkButton>
            <LocaleLinkButton
              href={paths.quote}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {quoteLabel}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
