import { Container, Section } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";

const stepKeys = [
  { title: "process.step1Title", body: "process.step1Body" },
  { title: "process.step2Title", body: "process.step2Body" },
  { title: "process.step3Title", body: "process.step3Body" },
  { title: "process.step4Title", body: "process.step4Body" },
  { title: "process.step5Title", body: "process.step5Body" },
] as const;

export async function ProcessSection() {
  const { t } = await getDictionary();

  const steps = stepKeys.map((keys, index) => ({
    step: String(index + 1).padStart(2, "0"),
    title: t(keys.title),
    description: t(keys.body),
  }));

  return (
    <Section variant="dark">
      <Container>
        <div className="text-center mb-12">
          <p className="text-label text-primary mb-3">{t("process.eyebrow")}</p>
          <h2 className="text-h2">{t("process.sectionTitle")}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {steps.map((item) => (
            <div key={item.step}>
              <span className="text-label text-primary">{item.step}</span>
              <h3 className="text-h3 mt-2 mb-3">{item.title}</h3>
              <p className="text-small text-muted">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <LocaleLinkButton href={paths.process} variant="outline">
            {t("process.moreLink")}
          </LocaleLinkButton>
        </div>
      </Container>
    </Section>
  );
}
