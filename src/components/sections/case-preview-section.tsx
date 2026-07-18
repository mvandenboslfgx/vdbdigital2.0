import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getPublicCases } from "@/config/commercial/cases";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LinkButton } from "@/components/ui/link-button";
import { paths } from "@/i18n/config";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";
import { VERMEULEN_LIVE_URL } from "@/components/visuals/site-browser-preview";
import { cn } from "@/lib/utilities/cn";

export async function CasePreviewSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);
  const cases = getPublicCases().filter(
    (item) => item.slug !== "vermeulen-bouwservice",
  );
  const showVermeulen = getPublicCases().some(
    (item) => item.slug === "vermeulen-bouwservice",
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
              ? "Demonstraties zijn expliciet gemarkeerd. Live klantcases tonen alleen aantoonbare projectinformatie."
              : "Demonstrations are explicitly labeled. Live client cases show only verifiable project information."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showVermeulen ? (
            <Card
              variant="light"
              className="group flex flex-col overflow-hidden p-0"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-elevated">
                <Image
                  src="/cases/vermeulen-bouwservice/desktop-home.webp"
                  alt={c.vermeulen.desktopAlt}
                  width={1440}
                  height={900}
                  className={cn(
                    "h-full w-full object-cover object-top transition-transform duration-500",
                    "motion-safe:group-hover:scale-[1.02]",
                  )}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/0 transition-colors duration-300",
                    "motion-safe:group-hover:bg-black/25",
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    "opacity-100 motion-safe:opacity-0 motion-safe:transition-opacity",
                    "motion-safe:group-hover:opacity-100",
                  )}
                >
                  <span className="rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm">
                    {c.vermeulen.openLiveHint}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <Badge className="mb-3 w-fit">{c.vermeulen.label}</Badge>
                <p className="text-xs text-light-muted mb-1">
                  {c.vermeulen.details.type}
                </p>
                <h3 className="text-h3 text-light-foreground mb-2">
                  {c.vermeulen.title}
                </h3>
                <p className="text-small text-light-muted mb-4 flex-1">
                  {c.vermeulen.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <LocaleLinkButton
                    href={`${paths.cases}/vermeulen-bouwservice`}
                    variant="outline"
                    size="sm"
                  >
                    {locale === "nl" ? "Bekijk case" : "View case"}
                  </LocaleLinkButton>
                  <LinkButton
                    href={VERMEULEN_LIVE_URL}
                    external
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5 text-light-muted"
                  >
                    Live
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </LinkButton>
                </div>
              </div>
            </Card>
          ) : null}

          {cases.map((item) => {
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
                <LocaleLinkButton
                  href={`${paths.cases}/${item.slug}`}
                  variant="outline"
                  size="sm"
                >
                  {locale === "nl" ? "Meer info" : "Learn more"}
                </LocaleLinkButton>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
