import { Container, Card, Section } from "@/components/ui/container";
import { Lock, Server, Eye, FileCheck } from "lucide-react";
import { getDictionary } from "@/i18n/get-dictionary";

const securityPointKeys = [
  { icon: Lock, title: "security.paymentsTitle", body: "security.paymentsBody" },
  { icon: Server, title: "security.validationTitle", body: "security.validationBody" },
  { icon: Eye, title: "security.privacyTitle", body: "security.privacyBody" },
  { icon: FileCheck, title: "security.auditTitle", body: "security.auditBody" },
] as const;

export async function SecuritySection() {
  const { t } = await getDictionary();

  const securityPoints = securityPointKeys.map(({ icon, title, body }) => ({
    icon,
    title: t(title),
    description: t(body),
  }));

  return (
    <Section variant="dark">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-label text-primary mb-3">{t("security.eyebrow")}</p>
            <h2 className="text-h2 mb-4">{t("security.title")}</h2>
            <p className="text-body-lg text-muted prose-width">{t("security.body")}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {securityPoints.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <Icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-small text-muted">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
