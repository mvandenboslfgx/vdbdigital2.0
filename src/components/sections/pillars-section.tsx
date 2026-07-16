import { Container, Card, Section } from "@/components/ui/container";
import { Globe, Bot, TrendingUp } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";

export async function PillarsSection() {
  const { t } = await getDictionary();

  const pillars = [
    { icon: Globe, title: t("pillars.build"), description: t("pillars.buildBody") },
    { icon: Bot, title: t("pillars.automate"), description: t("pillars.automateBody") },
    {
      icon: TrendingUp,
      title: t("pillars.grow"),
      description: t("pillars.growBody"),
    },
  ];

  return (
    <Section variant="light">
      <Container>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-label text-primary mb-3">{t("pillars.eyebrow")}</p>
          <h2 className="text-h2 text-light-foreground mb-3">{t("pillars.title")}</h2>
          <p className="text-body text-light-muted">{t("pillars.body")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map(({ icon: Icon, title, description }) => (
            <Card key={title} variant="light" className="text-left">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary mb-4">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-h3 text-light-foreground mb-2">{title}</h3>
              <p className="text-body text-light-muted">{description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
