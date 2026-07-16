import { Container, Card, Section } from "@/components/ui/container";
import { Shield, Zap, Layers, Headphones } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";

const benefitKeys = [
  { icon: Layers, title: "benefits.customTitle", body: "benefits.customBody" },
  { icon: Zap, title: "benefits.fastTitle", body: "benefits.fastBody" },
  { icon: Shield, title: "benefits.secureTitle", body: "benefits.secureBody" },
  { icon: Headphones, title: "benefits.supportTitle", body: "benefits.supportBody" },
] as const;

export async function BenefitsSection() {
  const { t } = await getDictionary();

  const benefits = benefitKeys.map(({ icon, title, body }) => ({
    icon,
    title: t(title),
    description: t(body),
  }));

  return (
    <Section variant="light">
      <Container>
        <div className="text-center mb-12">
          <p className="text-label text-light-muted mb-3">{t("benefits.eyebrow")}</p>
          <h2 className="text-h2 text-light-foreground">{t("benefits.title")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map(({ icon: Icon, title, description }) => (
            <Card key={title} variant="light">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-h3 text-light-foreground mb-2">{title}</h3>
              <p className="text-small text-light-muted">{description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
