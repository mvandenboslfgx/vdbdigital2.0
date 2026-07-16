import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { LocaleLink } from "@/i18n/locale-link";
import { paths } from "@/i18n/config";

const solutionLinks = [
  { key: "websites" as const, href: paths.websites },
  { key: "webshops" as const, href: paths.webshops },
  { key: "ai" as const, href: paths.aiAutomation },
  { key: "whatsapp" as const, href: paths.whatsappAi },
  { key: "reviews" as const, href: paths.reviewflows },
  { key: "maintenance" as const, href: paths.support },
];

export async function SolutionsGridSection() {
  const locale = await getLocale();
  const s = getCommercialContent(locale).solutionsGrid;

  return (
    <Section variant="dark">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{s.eyebrow}</p>
          <h2 className="text-h2">{s.title}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutionLinks.map(({ key, href }) => (
            <LocaleLink key={key} href={href}>
              <Card className="h-full hover:border-primary/40 transition-colors">
                <p className="font-medium">{s[key]}</p>
              </Card>
            </LocaleLink>
          ))}
        </div>
      </Container>
    </Section>
  );
}
