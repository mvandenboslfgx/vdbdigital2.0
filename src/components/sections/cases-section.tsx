import { Container, Card, Section } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";

const solutionTypeKeys = [
  { title: "cases.homeType1Title", body: "cases.homeType1Body", tags: "cases.homeType1Tags" },
  { title: "cases.homeType2Title", body: "cases.homeType2Body", tags: "cases.homeType2Tags" },
  { title: "cases.homeType3Title", body: "cases.homeType3Body", tags: "cases.homeType3Tags" },
  { title: "cases.homeType4Title", body: "cases.homeType4Body", tags: "cases.homeType4Tags" },
] as const;

export async function CasesSection() {
  const { t } = await getDictionary();

  const solutionTypes = solutionTypeKeys.map((keys) => ({
    title: t(keys.title),
    description: t(keys.body),
    tags: t(keys.tags).split("|"),
  }));

  return (
    <Section variant="light">
      <Container>
        <div className="text-center mb-12">
          <p className="text-label text-primary mb-3">{t("cases.eyebrow")}</p>
          <h2 className="text-h2 text-light-foreground">{t("cases.title")}</h2>
          <p className="text-body-lg text-light-muted mt-4 prose-width mx-auto">
            {t("cases.body")}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {solutionTypes.map((item) => (
            <Card key={item.title} variant="light">
              <h3 className="text-h3 text-light-foreground mb-2">{item.title}</h3>
              <p className="text-small text-light-muted mb-4">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-label px-2.5 py-1 rounded-md bg-primary-soft text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10 flex flex-wrap justify-center gap-3">
          <LocaleLinkButton href={paths.cases} variant="outline" tone="light">
            {t("cases.viewTypes")}
          </LocaleLinkButton>
          <LocaleLinkButton href={paths.quote}>{t("cases.discuss")}</LocaleLinkButton>
        </div>
      </Container>
    </Section>
  );
}
