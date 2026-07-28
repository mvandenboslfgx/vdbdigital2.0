import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, Section, Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import {
  getAllPublicSoftwareSlugs,
  getSoftwareBySlug,
  groupLabel,
} from "@/config/software-catalog";
import { SOFTWARE_GROUP_VISUAL } from "@/config/product-visuals";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPublicSoftwareSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const product = getSoftwareBySlug(slug, locale);
  if (!product) return { title: t("product.notFound") };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: buildLocaleAlternates(`${paths.shop}/${slug}`, locale),
  };
}

export default async function SoftwareProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const product = getSoftwareBySlug(slug, locale);
  if (!product) notFound();
  const visual = SOFTWARE_GROUP_VISUAL[product.group];

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
          <p className="text-label text-primary mb-3">
            {groupLabel(product.group, locale)}
          </p>
          <h1 className="text-h1 mb-4">{product.name}</h1>
          <p className="text-body-lg text-muted prose-width mb-6 max-w-2xl">
            {product.shortDescription}
          </p>
          <p className="text-xl font-semibold text-primary mb-6">
            {product.priceLabel === "verified" && product.publicPriceEur != null
              ? `€ ${product.publicPriceEur.toFixed(2).replace(".", ",")}`
              : t("shop.priceOnRequest")}
          </p>
          {product.priceLabel === "verified" ? (
            <p className="text-small text-muted mb-6">{t("shop.priceVerifiedNote")}</p>
          ) : null}
          <LocaleLinkButton
            href={`${paths.quote}?product=${encodeURIComponent(product.slug)}`}
            className="min-h-11"
          >
            {t("shop.requestQuote")}
          </LocaleLinkButton>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border aspect-[16/10]">
            <Image
              src={visual.src}
              alt={locale === "nl" ? visual.altNl : visual.altEn}
              width={visual.width}
              height={visual.height}
              className="h-full w-full object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-8 max-w-3xl">
          <Card variant="light">
            <h2 className="text-h3 text-light-foreground mb-4">
              {locale === "nl" ? "Specificaties" : "Specifications"}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="text-xs uppercase tracking-wide text-light-muted">
                    {spec.label}
                  </dt>
                  <dd className="text-light-foreground">{spec.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs uppercase tracking-wide text-light-muted">
                  {locale === "nl" ? "Merk" : "Brand"}
                </dt>
                <dd className="text-light-foreground">{product.brand}</dd>
              </div>
            </dl>
          </Card>

          <details className="rounded-lg border border-light-border bg-light-surface p-4">
            <summary className="cursor-pointer text-small font-medium text-light-foreground min-h-11 flex items-center">
              {locale === "nl" ? "Belangrijke voorwaarden" : "Important terms"}
            </summary>
            <div className="mt-3 text-small text-light-muted space-y-2">
              <p>
                {locale === "nl"
                  ? "Levering alleen na bevestigde beschikbaarheid, geldige regio en overdraagbare licentie. Geen directe online betaling op deze pagina."
                  : "Delivery only after confirmed availability, valid region and transferable license. No direct online payment on this page."}
              </p>
              <p>
                {locale === "nl"
                  ? "Historische adviesprijzen uit interne bronbestanden zijn geen actuele publieke prijzen."
                  : "Historical advisory prices from internal source files are not current public prices."}
              </p>
            </div>
          </details>

          <LocaleLink
            href={paths.shop}
            prefetch={false}
            className="text-small text-primary inline-flex min-h-11 items-center"
          >
            ← {t("shop.allProducts")}
          </LocaleLink>
        </Container>
      </Section>
    </>
  );
}
