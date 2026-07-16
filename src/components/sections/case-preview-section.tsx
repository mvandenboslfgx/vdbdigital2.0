import { Container, Section, Card, Badge } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getPublicCases } from "@/config/commercial/cases";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";
import { WhatsAppAiChatVisual } from "@/components/visuals/whatsapp-ai-chat-visual";

export async function CasePreviewSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);
  const cases = getPublicCases();

  return (
    <Section variant="light">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{locale === "nl" ? "Cases" : "Cases"}</p>
          <h2 className="text-h2 text-light-foreground mb-4">
            {locale === "nl" ? "Wat we bouwen — eerlijk gelabeld" : "What we build — clearly labeled"}
          </h2>
          <p className="text-light-muted">
            {locale === "nl"
              ? "Demonstraties zijn expliciet gemarkeerd. Echte klantcases verschijnen alleen na goedkeuring."
              : "Demonstrations are explicitly labeled. Real client cases appear only after approval."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((item) => {
            const label =
              item.type === "demonstration"
                ? c.caseLabel.demonstration
                : item.type === "internal"
                  ? c.caseLabel.internal
                  : c.caseLabel.real;
            const copyKey = item.i18nKey as keyof typeof c;
            const copy = c[copyKey] as { title: string; summary: string; step1?: string; step2?: string; step3?: string };

            return (
              <Card key={item.slug} variant="light" className="flex flex-col">
                <Badge className="mb-3 w-fit">{label}</Badge>
                <h3 className="text-h3 text-light-foreground mb-2">{copy.title}</h3>
                <p className="text-small text-light-muted mb-4 flex-1">{copy.summary}</p>
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
                {item.slug !== "vermeulen-bouwservice" ? (
                  <LocaleLinkButton href={`${paths.cases}/${item.slug}`} variant="outline" size="sm">
                    {locale === "nl" ? "Meer info" : "Learn more"}
                  </LocaleLinkButton>
                ) : null}
              </Card>
            );
          })}
          <Card variant="light" className="border-dashed">
            <Badge className="mb-3 w-fit">{c.caseLabel.draft}</Badge>
            <h3 className="text-h3 text-light-foreground mb-2">{c.vermeulen.title}</h3>
            <p className="text-small text-light-muted mb-2">{c.vermeulen.summary}</p>
            <p className="text-xs text-light-muted">{c.vermeulen.status}</p>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
