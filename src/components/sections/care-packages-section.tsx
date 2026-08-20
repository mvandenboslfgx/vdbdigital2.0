import { CatalogProductGrid } from "@/components/shop/catalog-product-grid";
import { Container, Section } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { listPublicShopProducts } from "@/server/repositories/public-shop-catalog";

export async function CarePackagesSection() {
  const locale = await getLocale();
  const content = getCommercialContent(locale);
  const products = (await listPublicShopProducts())
    .filter((product) => {
      const value = [product.categorySlug, ...(product.tags ?? [])].join(" ").toLowerCase();
      return (
        value.includes("care") ||
        value.includes("support") ||
        value.includes("maintenance") ||
        value.includes("onderhoud")
      );
    })
    .slice(0, 4);

  return (
    <Section variant="dark" data-pricing-section="supabase-catalog-care">
      <Container className="space-y-8">
        <div className="max-w-2xl">
          <p className="text-label mb-3 text-primary">{content.care.eyebrow}</p>
          <h2 className="text-h2 mb-4">{content.care.title}</h2>
          <p className="text-body text-muted">{content.care.body}</p>
        </div>
        {products.length ? (
          <CatalogProductGrid
            products={products}
            locale={locale}
            recommendedLabel={locale === "nl" ? "Aanbevolen" : "Recommended"}
            viewLabel={locale === "nl" ? "Bekijk product" : "View product"}
          />
        ) : (
          <div className="rounded-xl border border-white/10 p-6 text-muted">
            <p className="mb-4">
              {locale === "nl"
                ? "Er zijn nog geen volledig goedgekeurde supportproducten gepubliceerd."
                : "No fully approved support products have been published yet."}
            </p>
            <LocaleLinkButton href={paths.shop} variant="outline" tone="dark">
              {locale === "nl" ? "Bekijk de catalogus" : "View catalogue"}
            </LocaleLinkButton>
          </div>
        )}
      </Container>
    </Section>
  );
}
