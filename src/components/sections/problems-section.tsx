import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";

const problemItems = [
  { title: "slow" as const, body: "slowBody" as const },
  { title: "missed" as const, body: "missedBody" as const },
  { title: "weakCta" as const, body: "weakCtaBody" as const },
  { title: "manual" as const, body: "manualBody" as const },
  { title: "disconnected" as const, body: "disconnectedBody" as const },
  { title: "mobile" as const, body: "mobileBody" as const },
];

export async function ProblemsSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);
  const p = c.problems;

  return (
    <Section variant="dark">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{p.eyebrow}</p>
          <h2 className="text-h2 mb-4">{p.title}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problemItems.map(({ title, body }) => (
            <Card key={title}>
              <h3 className="font-medium mb-2">{p[title]}</h3>
              <p className="text-small text-muted">{p[body]}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
