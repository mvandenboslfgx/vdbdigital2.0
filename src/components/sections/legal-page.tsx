import { Container, Section } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";

interface LegalPageContentProps {
  title: string;
  children: React.ReactNode;
}

export async function LegalPageContent({ title, children }: LegalPageContentProps) {
  const { t } = await getDictionary();

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container className="max-w-3xl">
          <h1 className="text-h1 mb-2">{title}</h1>
          <p className="text-small text-muted">
            {t("legal.lastUpdated", { date: siteConfig.legal.lastUpdated })}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container className="max-w-3xl prose-width">
          <div className="space-y-6 text-light-muted text-body">{children}</div>
        </Container>
      </Section>
    </>
  );
}
