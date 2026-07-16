import { MarketingLayout } from "@/components/layout/marketing-layout";
import { Container, Section } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export default async function NotFound() {
  const { t } = await getDictionary();

  return (
    <MarketingLayout>
      <Section variant="dark" className="pt-16 min-h-[55vh]">
        <Container className="text-center max-w-2xl">
          <p className="text-label text-primary mb-3">404</p>
          <h1 className="text-display mb-4">{t("notFound.title")}</h1>
          <p className="text-body-lg text-muted mb-8">{t("notFound.body")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LocaleLinkButton href="/">{t("common.backHome")}</LocaleLinkButton>
            <LocaleLinkButton href={paths.solutions} variant="outline">
              {t("notFound.solutions")}
            </LocaleLinkButton>
            <LocaleLinkButton href={paths.contact} variant="ghost">
              {t("nav.contact")}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </MarketingLayout>
  );
}
