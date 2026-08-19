import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { LocaleLink } from "@/i18n/locale-link";
import { catalogPillars, CATALOG_PILLAR_ORDER } from "@/config/catalog";

export async function SolutionsGridSection() {
  const locale = await getLocale();
  const content = getCommercialContent(locale).pillarsGrid;

  return (
    <Section variant="dark">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{content.eyebrow}</p>
          <h2 className="text-h2">{content.title}</h2>
          <p className="text-body text-muted mt-3">{content.body}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATALOG_PILLAR_ORDER.map((pillarId) => {
            const pillar = catalogPillars.find((p) => p.id === pillarId)!;
            const copy = content[pillar.i18nKey];
            return (
              <LocaleLink key={pillar.id} href={pillar.shopHref}>
                <Card
                  className={`h-full hover:border-primary/40 transition-colors ${pillar.secondary ? "opacity-95" : ""}`}
                >
                  <p className="text-label text-primary mb-2">{copy.label}</p>
                  <p className="font-medium mb-2">{copy.title}</p>
                  <p className="text-small text-muted">{copy.summary}</p>
                </Card>
              </LocaleLink>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
