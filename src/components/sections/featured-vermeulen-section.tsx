import { ExternalLink } from "lucide-react";
import { Container, Section, Badge } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { SiteBrowserPreview, VERMEULEN_LIVE_URL } from "@/components/visuals/site-browser-preview";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { paths } from "@/i18n/config";
import { isCasePubliclyVisible } from "@/config/commercial/cases";

/**
 * Homepage “Uitgelicht project” — Vermeulen Bouwservice live client case.
 * Only renders when the case is publicly visible.
 */
export async function FeaturedVermeulenSection() {
  if (!isCasePubliclyVisible("vermeulen-bouwservice")) {
    return null;
  }

  const locale = await getLocale();
  const v = getCommercialContent(locale).vermeulen;

  return (
    <Section variant="dark" className="overflow-hidden">
      <Container>
        <p className="text-label text-primary mb-8">
          {locale === "nl" ? "Uitgelicht project" : "Featured project"}
        </p>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="order-1">
            <Badge className="mb-4 w-fit">{v.label}</Badge>
            <h2 className="text-h1 mb-4 text-balance">{v.title}</h2>
            <p className="text-body-lg text-muted mb-6 max-w-xl">{v.featuredIntro}</p>

            <ul className="mb-8 flex flex-wrap gap-2" aria-label={locale === "nl" ? "Projecttags" : "Project tags"}>
              {v.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md border border-border/70 bg-surface-elevated/60 px-2.5 py-1 text-xs text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <LocaleLinkButton href={`${paths.cases}/vermeulen-bouwservice`}>
                {v.viewCase}
              </LocaleLinkButton>
              <LinkButton
                href={VERMEULEN_LIVE_URL}
                external
                variant="outline"
                className="inline-flex items-center gap-2"
              >
                {v.openLive}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
            </div>
          </div>

          <div className="order-2 lg:pl-2">
            <SiteBrowserPreview
              desktopSrc="/cases/vermeulen-bouwservice/desktop-home.webp"
              mobileSrc="/cases/vermeulen-bouwservice/mobile-home.webp"
              desktopAlt={v.desktopAlt}
              mobileAlt={v.mobileAlt}
              address="vermeulenbouwservice.nl"
              liveLabel={v.liveBadge}
              openHint={v.openLiveHint}
              size="featured"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
