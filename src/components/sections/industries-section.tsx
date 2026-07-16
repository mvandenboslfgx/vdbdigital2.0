import { Container, Card, Section } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";

const industryKeys = [
  { title: "industries.servicesTitle", body: "industries.servicesBody" },
  { title: "industries.retailTitle", body: "industries.retailBody" },
  { title: "industries.healthcareTitle", body: "industries.healthcareBody" },
  { title: "industries.technicalTitle", body: "industries.technicalBody" },
  { title: "industries.hospitalityTitle", body: "industries.hospitalityBody" },
  { title: "industries.smbTitle", body: "industries.smbBody" },
] as const;

export async function IndustriesSection() {
  const { t } = await getDictionary();

  const industries = industryKeys.map((keys) => ({
    title: t(keys.title),
    description: t(keys.body),
  }));

  return (
    <Section variant="light">
      <Container>
        <div className="text-center mb-12">
          <p className="text-label text-light-muted mb-3">{t("industries.eyebrow")}</p>
          <h2 className="text-h2 text-light-foreground">{t("industries.title")}</h2>
          <p className="text-body-lg text-light-muted mt-4 prose-width mx-auto">
            {t("industries.body")}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((item) => (
            <Card key={item.title} variant="light">
              <h3 className="text-h3 text-light-foreground mb-2">{item.title}</h3>
              <p className="text-small text-light-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
