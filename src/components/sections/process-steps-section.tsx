import { Container, Section } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";

const stepKeys = [
  "step1",
  "step2",
  "step3",
  "step4",
  "step5",
  "step6",
  "step7",
  "step8",
] as const;

export async function ProcessStepsSection() {
  const locale = await getLocale();
  const steps = getCommercialContent(locale).processSteps;

  return (
    <Section variant="light">
      <Container>
        <p className="text-label text-primary mb-3">
          {locale === "nl" ? "Werkwijze" : "Process"}
        </p>
        <h2 className="text-h2 text-light-foreground mb-10">
          {locale === "nl" ? "Van kennismaking tot doorlopende support" : "From introduction to ongoing support"}
        </h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stepKeys.map((key, index) => (
            <li
              key={key}
              className="rounded-lg border border-light-border bg-light-surface p-4"
            >
              <span className="text-label text-primary mb-2 block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-medium text-light-foreground">{steps[key]}</span>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
