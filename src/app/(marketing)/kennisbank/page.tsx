import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, Section, Card } from "@/components/ui/container";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { seoPaths } from "@/config/seo-routes";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

/** Planned knowledge base topics — architecture only, no thin auto-generated articles. */
const plannedTopics = [
  {
    slug: "kosten-website-laten-maken",
    title: "Wat kost een website laten maken?",
    href: "/website-laten-maken",
  },
  {
    slug: "duur-website-bouwen",
    title: "Hoe lang duurt het bouwen van een website?",
    href: "/website-laten-maken",
  },
  {
    slug: "website-laten-maken-of-zelf-bouwen",
    title: "Website laten maken of zelf bouwen?",
    href: "/website-laten-maken",
  },
  {
    slug: "goede-bedrijfswebsite",
    title: "Wat maakt een goede bedrijfswebsite?",
    href: "/webdesign",
  },
  {
    slug: "conversieoptimalisatie",
    title: "Wat is conversieoptimalisatie?",
    href: "/solutions/conversion-optimisation",
  },
  {
    slug: "ai-chatbot-bedrijf",
    title: "Wat kan een AI-chatbot voor mijn bedrijf doen?",
    href: "/ai-chatbot",
  },
  {
    slug: "whatsapp-automatiseren",
    title: "WhatsApp automatiseren: hoe werkt dat?",
    href: "/whatsapp-automatisering",
  },
  {
    slug: "kosten-maatwerk-software",
    title: "Wat kost maatwerk software?",
    href: "/maatwerk-software",
  },
  {
    slug: "wanneer-klantportaal",
    title: "Wanneer heeft een bedrijf een klantportaal nodig?",
    href: "/klantportaal-laten-maken",
  },
  {
    slug: "wordpress-vs-maatwerk",
    title: "WordPress versus maatwerk website",
    href: "/website-laten-maken",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  if (locale === "en") {
    return {
      title: "Knowledge base",
      description: "Articles and guides about websites, automation and digital systems.",
      alternates: buildLocaleAlternates(seoPaths.kennisbank, locale),
    };
  }
  return {
    title: "Kennisbank",
    description:
      "Praktische kennis over websites, webdesign, AI automatisering en bedrijfssoftware voor Nederlandse ondernemers.",
    alternates: buildLocaleAlternates(seoPaths.kennisbank, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function KennisbankPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);

  if (locale === "en") {
    redirect(paths.solutions);
  }

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">Kennisbank</p>
          <h1 className="text-h1 mb-4">Kennis over websites, automatisering en software</h1>
          <p className="text-body-lg text-muted prose-width max-w-2xl">
            Praktische antwoorden voor ondernemers — geen dunne SEO-artikelen, maar
            onderwerpen die we uitwerken wanneer ze echt waarde toevoegen.
          </p>
        </Container>
      </Section>

      <Section variant="light">
        <Container>
          <h2 className="text-h2 text-light-foreground mb-6">Geplande onderwerpen</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {plannedTopics.map((topic) => (
              <Card key={topic.slug} variant="light">
                <h3 className="text-h3 text-light-foreground mb-2">{topic.title}</h3>
                <p className="text-small text-light-muted mb-4">
                  Artikel in voorbereiding — bekijk intussen onze dienstpagina.
                </p>
                <LocaleLink
                  href={topic.href}
                  className="text-small text-primary underline-offset-2 hover:underline"
                >
                  Naar dienstpagina →
                </LocaleLink>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-muted mb-4">
              Staat jouw vraag er niet bij? Plan een kennismaking — we denken graag mee.
            </p>
            <LocaleLinkButton href={`${paths.contact}?intent=introduction`} size="lg">
              {t("nav.scheduleIntro")}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
