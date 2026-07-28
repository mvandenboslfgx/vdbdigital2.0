import { Container, Section, Card, Badge } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  getCaseLiveUrl,
  getPublicCases,
} from "@/config/commercial/cases";
import { ServerLocaleLinkButton } from "@/components/ui/server-locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { paths } from "@/i18n/config";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";
import { cn } from "@/lib/utilities/cn";

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

const PORTFOLIO_SLUGS = new Set([
  "vermeulen-bouwservice",
  "grill-gasten",
  "trustbooker",
]);

export async function CasePreviewSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);
  const publicCases = getPublicCases();
  const portfolio = publicCases.filter((item) => PORTFOLIO_SLUGS.has(item.slug));
  const demos = publicCases.filter(
    (item) => !PORTFOLIO_SLUGS.has(item.slug),
  );

  return (
    <Section variant="light">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">
            {locale === "nl" ? "Cases" : "Cases"}
          </p>
          <h2 className="text-h2 text-light-foreground mb-4">
            {locale === "nl"
              ? "Wat we bouwen — eerlijk gelabeld"
              : "What we build — clearly labeled"}
          </h2>
          <p className="text-light-muted">
            {locale === "nl"
              ? "Live klantcases, projecten in ontwikkeling en demonstraties zijn expliciet gemarkeerd. Geen verzonnen resultaten."
              : "Live client cases, in-development projects and demonstrations are explicitly labeled. No fabricated results."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolio.map((item) => {
            const copy =
              c[item.i18nKey as "vermeulen" | "grillGasten" | "trustbooker"];
            const liveUrl = getCaseLiveUrl(item);
            const isLive = item.launchStatus === "LIVE" && Boolean(liveUrl);
            const image =
              item.slug === "trustbooker"
                ? `/cases/${item.assetDir}/desktop-dashboard.webp`
                : `/cases/${item.assetDir}/desktop-home.webp`;

            return (
              <Card
                key={item.slug}
                variant="light"
                className="group flex flex-col overflow-hidden p-0"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-elevated">
                  {/* Native lazy img avoids home-only next/image client chunk on critical path. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- below-fold; next/image client runtime delayed home mobile LCP */}
                  <img
                    src={image}
                    alt={copy.desktopAlt}
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "h-full w-full object-cover object-top transition-transform duration-500",
                      "motion-safe:group-hover:scale-[1.02]",
                    )}
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Badge className="mb-3 w-fit">{copy.label}</Badge>
                  <p className="text-xs text-light-muted mb-1">
                    {copy.category}
                  </p>
                  <h3 className="text-h3 text-light-foreground mb-2">
                    {copy.title}
                  </h3>
                  <p className="text-small text-light-muted mb-4 flex-1">
                    {copy.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <ServerLocaleLinkButton
                      href={`${paths.cases}/${item.slug}`}
                      variant="outline"
                      tone="light"
                      size="sm"
                    >
                      {copy.viewCase}
                    </ServerLocaleLinkButton>
                    {isLive && liveUrl ? (
                      <LinkButton
                        href={liveUrl}
                        external
                        variant="ghost"
                        tone="light"
                        size="sm"
                        className="inline-flex items-center gap-1.5 text-light-muted"
                        aria-label={`${copy.openLive}: ${item.domainLabel}`}
                      >
                        Live
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </LinkButton>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}

          {demos.map((item) => {
            const label =
              item.type === "demonstration"
                ? c.caseLabel.demonstration
                : item.type === "internal"
                  ? c.caseLabel.internal
                  : c.caseLabel.real;
            const copyKey = item.i18nKey as keyof typeof c;
            const copy = c[copyKey] as {
              title: string;
              summary: string;
              step1?: string;
              step2?: string;
              step3?: string;
            };

            return (
              <Card key={item.slug} variant="light" className="flex flex-col">
                <Badge className="mb-3 w-fit">{label}</Badge>
                <h3 className="text-h3 text-light-foreground mb-2">
                  {copy.title}
                </h3>
                <p className="text-small text-light-muted mb-4 flex-1">
                  {copy.summary}
                </p>
                {item.i18nKey === "demoWhatsapp" && copy.step1 ? (
                  <WhatsAppAiChatVisual
                    title={copy.title}
                    steps={[
                      { label: copy.step1 },
                      { label: copy.step2! },
                      { label: copy.step3! },
                    ]}
                    className="mb-4"
                  />
                ) : null}
                <ServerLocaleLinkButton
                  href={`${paths.cases}/${item.slug}`}
                  variant="outline"
                  tone="light"
                  size="sm"
                >
                  {locale === "nl"
                    ? `Meer over ${copy.title}`
                    : `More about ${copy.title}`}
                </ServerLocaleLinkButton>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
