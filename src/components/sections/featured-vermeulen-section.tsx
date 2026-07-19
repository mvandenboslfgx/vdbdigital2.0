import { ExternalLink } from "lucide-react";
import { Container, Section, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { CaseWebsitePreview } from "@/components/visuals/site-browser-preview";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { paths } from "@/i18n/config";
import {
  getCaseLiveUrl,
  getFeaturedPortfolioCases,
  type CaseDefinition,
} from "@/config/commercial/cases";

type Commercial = ReturnType<typeof getCommercialContent>;

function caseCopy(c: CaseDefinition, commercial: Commercial) {
  return commercial[c.i18nKey as "vermeulen" | "grillGasten" | "trustbooker"];
}

/**
 * Homepage “Uitgelichte projecten” — live client cases + coming-soon platforms.
 */
export async function FeaturedProjectsSection() {
  const locale = await getLocale();
  const commercial = getCommercialContent(locale);
  const featured = getFeaturedPortfolioCases().filter(
    (c) =>
      c.slug === "vermeulen-bouwservice" ||
      c.slug === "grill-gasten" ||
      c.slug === "trustbooker",
  );

  if (featured.length === 0) return null;

  const sectionTitle =
    locale === "nl" ? "Uitgelichte projecten" : "Featured projects";

  return (
    <Section variant="dark" className="overflow-hidden">
      <Container>
        <p className="text-label text-primary mb-10">{sectionTitle}</p>

        <div className="space-y-16 lg:space-y-20">
          {featured.map((item) => {
            const copy = caseCopy(item, commercial);
            const liveUrl = getCaseLiveUrl(item);
            const isLive = item.launchStatus === "LIVE" && Boolean(liveUrl);
            const desktop =
              item.slug === "trustbooker"
                ? `/cases/${item.assetDir}/desktop-dashboard.webp`
                : `/cases/${item.assetDir}/desktop-home.webp`;
            const mobile =
              item.slug === "trustbooker"
                ? `/cases/${item.assetDir}/mobile-preview.webp`
                : `/cases/${item.assetDir}/mobile-home.webp`;

            return (
              <div
                key={item.slug}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16"
              >
                <div className="order-1">
                  <Badge className="mb-4 w-fit">{copy.label}</Badge>
                  <p className="text-xs text-muted mb-2">{copy.category}</p>
                  <h2 className="text-h1 mb-4 text-balance">{copy.title}</h2>
                  <p className="text-body-lg text-muted mb-6 max-w-xl">
                    {copy.featuredIntro}
                  </p>

                  <ul
                    className="mb-8 flex flex-wrap gap-2"
                    aria-label={
                      locale === "nl" ? "Projecttags" : "Project tags"
                    }
                  >
                    {copy.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-md border border-border/70 bg-surface-elevated/60 px-2.5 py-1 text-xs text-muted"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <LocaleLinkButton href={`${paths.cases}/${item.slug}`}>
                      {copy.viewCase}
                    </LocaleLinkButton>
                    {isLive && liveUrl ? (
                      <LinkButton
                        href={liveUrl}
                        external
                        variant="outline"
                        className="inline-flex items-center gap-2"
                        aria-label={`${copy.openLive}: ${item.domainLabel}`}
                      >
                        {copy.openLive}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </LinkButton>
                    ) : "launchNote" in copy && copy.launchNote ? (
                      <span className="inline-flex items-center justify-center rounded-md border border-border/70 px-4 py-2 text-sm text-muted">
                        {copy.launchNote}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="order-2 lg:pl-2">
                  <CaseWebsitePreview
                    desktopSrc={desktop}
                    mobileSrc={mobile}
                    desktopAlt={copy.desktopAlt}
                    mobileAlt={copy.mobileAlt}
                    address={item.domainLabel ?? copy.title}
                    statusLabel={copy.liveBadge}
                    openHint={copy.openLiveHint}
                    size="featured"
                    liveUrl={liveUrl}
                    externalLinkEnabled={isLive}
                    internalHref={
                      isLive ? null : `${paths.cases}/${item.slug}`
                    }
                    launchStatus={item.launchStatus}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

/** @deprecated Prefer FeaturedProjectsSection */
export { FeaturedProjectsSection as FeaturedVermeulenSection };
