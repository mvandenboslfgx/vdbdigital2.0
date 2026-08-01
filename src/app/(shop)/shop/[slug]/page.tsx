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
  getPublicShopProductBySlug,
  publicShopCtaLabel,
  publicShopPriceDisplay,
} from "@/server/repositories/public-shop-catalog";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/** Locale cookies make this route request-dynamic; do not SSG at build time. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const product = await getPublicShopProductBySlug(slug, locale);
  if (!product) return { title: t("product.notFound") };

  const title = product.seoTitle?.trim() || product.name;
  const description =
    product.seoDescription?.trim() || product.shortDescription;

  return {
    title,
    description,
    alternates: buildLocaleAlternates(`${paths.shop}/${slug}`, locale),
    openGraph: {
      title,
      description,
      images: product.primaryImagePath
        ? [{ url: product.primaryImagePath }]
        : undefined,
    },
  };
}

export default async function ShopProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const product = await getPublicShopProductBySlug(slug, locale);
  if (!product) notFound();

  const price = publicShopPriceDisplay(product, locale);
  const cta = publicShopCtaLabel(product, locale);
  const imageSrc = product.primaryImagePath!;

  const audience = [
    product.audienceB2b ? "B2B" : null,
    product.audienceB2c ? "B2C" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-label text-primary mb-3">
              {product.categoryName || t("nav.shop")}
            </p>
            <h1 className="text-h1 mb-4">{product.name}</h1>
            <p className="text-body-lg text-muted prose-width mb-6 max-w-2xl">
              {product.shortDescription}
            </p>
            <p className="text-xl font-semibold text-primary mb-2">
              {price.mode === "on_request" && !product.priceLabel
                ? t("shop.priceOnRequest")
                : price.label}
            </p>
            <p className="text-small text-muted mb-6">
              {locale === "nl"
                ? "Geen directe online betaling. Checkout en Mollie blijven uitgeschakeld."
                : "No direct online payment. Checkout and Mollie remain disabled."}
            </p>
            <LocaleLinkButton
              href={`${paths.quote}?product=${encodeURIComponent(product.slug)}`}
              className="min-h-11"
            >
              {cta}
            </LocaleLinkButton>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border aspect-[16/10]">
            <Image
              src={imageSrc}
              alt={product.name}
              width={1200}
              height={750}
              className="h-full w-full object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized={imageSrc.endsWith(".svg")}
            />
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-8 max-w-3xl">
          <Card variant="light">
            <h2 className="text-h3 text-light-foreground mb-4">
              {locale === "nl" ? "Productdetails" : "Product details"}
            </h2>
            <div className="text-small text-light-foreground whitespace-pre-wrap">
              {product.fullDescription.replace(/<[^>]+>/g, "")}
            </div>
          </Card>

          <Card variant="light">
            <h2 className="text-h3 text-light-foreground mb-4">
              {locale === "nl" ? "Kenmerken" : "Attributes"}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-light-muted">
                  {locale === "nl" ? "Categorie" : "Category"}
                </dt>
                <dd className="text-light-foreground">
                  {product.categoryName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-light-muted">
                  Audience
                </dt>
                <dd className="text-light-foreground">{audience || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-light-muted">
                  {locale === "nl" ? "Facturatie" : "Billing"}
                </dt>
                <dd className="text-light-foreground">
                  {product.billingType.replaceAll("_", " ")}
                </dd>
              </div>
              {product.deliveryTime ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-light-muted">
                    {locale === "nl" ? "Levertijd" : "Delivery"}
                  </dt>
                  <dd className="text-light-foreground">
                    {product.deliveryTime}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {product.includedItems?.length ? (
            <Card variant="light">
              <h2 className="text-h3 text-light-foreground mb-4">
                {locale === "nl" ? "Inbegrepen" : "Included"}
              </h2>
              <ul className="list-disc pl-5 text-small text-light-muted space-y-1">
                {product.includedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          <details className="rounded-lg border border-light-border bg-light-surface p-4">
            <summary className="cursor-pointer text-small font-medium text-light-foreground min-h-11 flex items-center">
              {locale === "nl" ? "Belangrijke voorwaarden" : "Important terms"}
            </summary>
            <div className="mt-3 text-small text-light-muted space-y-2">
              <p>
                {product.warnings?.trim() ||
                  (locale === "nl"
                    ? "Levering alleen na bevestigde beschikbaarheid. Geen directe online betaling op deze pagina."
                    : "Delivery only after confirmed availability. No direct online payment on this page.")}
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
