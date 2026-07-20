import { Container, Section } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";

export async function CtaSection() {
  const { t } = await getDictionary();

  return (
    <Section variant="light">
      <Container>
        <div
          data-surface="light"
          className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-light-border bg-light-surface p-10 text-center md:p-16"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(78,115,255,0.12), transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="text-label text-primary mb-3">{t("cta.eyebrow")}</p>
            <h2 className="text-h2 text-light-foreground mb-4">{t("cta.title")}</h2>
            <p className="text-body-lg text-light-muted mb-8 prose-width mx-auto">
              {t("cta.body")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <LocaleLinkButton href={`${paths.contact}?intent=introduction`} size="lg">
                {t("cta.intro")}
              </LocaleLinkButton>
              <LocaleLinkButton
                href={paths.quote}
                variant="outline"
                tone="light"
                size="lg"
              >
                {t("cta.quote")}
              </LocaleLinkButton>
              <LocaleLinkButton
                href={paths.cases}
                variant="ghost"
                tone="light"
                size="lg"
              >
                {t("cta.cases")}
              </LocaleLinkButton>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
