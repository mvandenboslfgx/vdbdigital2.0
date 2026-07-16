import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("checkout.cancelledTitle"),
    robots: { index: false },
  };
}

export default async function CheckoutCancelledPage() {
  const { t } = await getDictionary();

  return (
    <Section variant="dark" className="pt-12 min-h-[60vh]">
      <Container className="max-w-lg text-center">
        <Card>
          <h1 className="text-h2 mb-4">{t("checkout.cancelledTitle")}</h1>
          <p className="text-muted mb-6">{t("checkout.cancelledBody")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LocaleLinkButton href={paths.checkout}>{t("checkout.tryAgain")}</LocaleLinkButton>
            <LocaleLinkButton href={paths.shop} variant="outline">
              {t("checkout.toShop")}
            </LocaleLinkButton>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
