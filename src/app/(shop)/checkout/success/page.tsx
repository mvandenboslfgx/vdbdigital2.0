import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("checkout.successTitle"),
    robots: { index: false },
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { t } = await getDictionary();
  const { order } = await searchParams;

  return (
    <Section variant="dark" className="pt-12 min-h-[60vh]">
      <Container className="max-w-lg text-center">
        <Card>
          <div className="text-success text-4xl mb-4">✓</div>
          <h1 className="text-h2 mb-4">{t("checkout.successTitle")}</h1>
          <p className="text-muted mb-6">{t("checkout.successBody")}</p>
          {order && (
            <p className="text-small text-muted mb-6">
              {t("checkout.reference")}: {order}
            </p>
          )}
          <LocaleLinkButton href={paths.home}>{t("checkout.backHome")}</LocaleLinkButton>
        </Card>
      </Container>
    </Section>
  );
}
