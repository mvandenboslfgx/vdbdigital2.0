import type { Metadata } from "next";
import { CatalogProductGrid } from "@/components/shop/catalog-product-grid";
import { Card, Container, Section } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { queryPublicShopCatalog } from "@/server/repositories/public-shop-catalog";

interface SoftwareShopPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("softwareShop.metaTitle"),
    description: t("softwareShop.metaDescription"),
    alternates: buildLocaleAlternates(paths.shopSoftware, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

export default async function SoftwareShopPage({ searchParams }: SoftwareShopPageProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const { q = "" } = await searchParams;
  const catalog = await queryPublicShopCatalog({ q: q.trim(), pageSize: 24 });
  const products = catalog.items.filter((product) => {
    const searchable = [product.categorySlug, ...(product.tags ?? [])].join(" ").toLowerCase();
    return searchable.includes("software") || searchable.includes("licen");
  });

  return (
    <>
      <Section variant="dark" className="pb-10 pt-12">
        <Container>
          <p className="text-label mb-3 text-primary">{t("softwareShop.eyebrow")}</p>
          <h1 className="text-h1 mb-4">{t("softwareShop.title")}</h1>
          <p className="text-body-lg prose-width max-w-3xl text-muted">
            {t("softwareShop.intro")}
          </p>
        </Container>
      </Section>
      <Section variant="light">
        <Container className="space-y-8">
          <form method="get" className="flex max-w-xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="software-search">
              {t("softwareShop.searchLabel")}
            </label>
            <input
              id="software-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("softwareShop.searchPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-light-border bg-light-surface px-4 py-3 text-base text-light-foreground"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-lg bg-primary px-5 text-small font-medium text-white"
            >
              {t("softwareShop.searchLabel")}
            </button>
          </form>

          {products.length ? (
            <CatalogProductGrid
              products={products}
              locale={locale}
              recommendedLabel={t("shop.recommended")}
              viewLabel={locale === "nl" ? "Bekijk licentie" : "View license"}
            />
          ) : (
            <Card variant="light" className="px-6 py-14 text-center">
              <h2 className="text-h3 mb-3 text-light-foreground">
                {locale === "nl"
                  ? "Nog geen geverifieerde softwarelicenties gepubliceerd"
                  : "No verified software licences published yet"}
              </h2>
              <p className="text-body mx-auto mb-6 max-w-2xl text-light-muted">
                {locale === "nl"
                  ? "Deze lijst komt rechtstreeks uit Supabase. Alleen ACTIVE/PUBLISHED-producten met geldige prijs, tekst, juridische goedkeuring en afbeelding verschijnen hier."
                  : "This list is loaded directly from Supabase. Only ACTIVE/PUBLISHED products with valid pricing, copy, legal approval and an image appear here."}
              </p>
              <LocaleLinkButton href={`${paths.quote}?intent=software-license`}>
                {t("softwareShop.requestLicense")}
              </LocaleLinkButton>
            </Card>
          )}
        </Container>
      </Section>
    </>
  );
}
