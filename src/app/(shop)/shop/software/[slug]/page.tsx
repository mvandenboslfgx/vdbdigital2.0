import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { getPublicSoftwareBySlug } from "@/server/repositories/software-public-catalog";

interface SoftwareDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SoftwareDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const item = getPublicSoftwareBySlug(slug, locale);
  if (!item) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  return {
    title: item.name,
    description: item.shortDescription,
    alternates: buildLocaleAlternates(`${paths.shopSoftware}/${slug}`, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function SoftwareDetailPage({
  params,
}: SoftwareDetailPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const item = getPublicSoftwareBySlug(slug, locale);

  if (!item) notFound();

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">{item.brand}</p>
          <h1 className="text-h1 mb-4">{item.name}</h1>
          <p className="text-body-lg text-muted prose-width">{item.shortDescription}</p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="max-w-3xl space-y-8">
          <Card variant="light">
            <h2 className="text-h3 text-light-foreground mb-4">
              {t("softwareShop.specifications")}
            </h2>
            <dl className="space-y-3">
              {item.specs.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-4 text-small">
                  <dt className="text-light-muted">{spec.label}</dt>
                  <dd className="text-light-foreground font-medium text-right">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <LocaleLinkButton
              href={`${paths.quote}?intent=software-license&software=${encodeURIComponent(item.slug)}`}
              size="lg"
            >
              {t("softwareShop.requestLicense")}
            </LocaleLinkButton>
            <LocaleLinkButton
              href={paths.shopSoftware}
              variant="outline"
              size="lg"
            >
              {t("softwareShop.backToCatalog")}
            </LocaleLinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
