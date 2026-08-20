import { CatalogProductGrid } from "@/components/shop/catalog-product-grid";
import { Container, Section } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { listPublicShopProducts } from "@/server/repositories/public-shop-catalog";

export async function PackagesSection() {
  const locale = await getLocale();
  const content = getCommercialContent(locale);
  const products = (await listPublicShopProducts())
    .filter((product) => {
      const value = [product.categorySlug, ...(product.tags ?? [])].join(" ").toLowerCase();
      return value.includes("website") || value.includes("webshop") || value.includes("build");
    })
    .slice(0, 4);

  return (
    <Section variant="light" id="packages" data-pricing-section="supabase-catalog">
      <Container className="space-y-8">
        <div className="max-w-2xl">
          <p className="text-label mb-3 text-primary">{content.packages.eyebrow}</p>
          <h2 className="text-h2 mb-4 text-light-foreground">{content.packages.title}</h2>
          <p className="text-body text-light-muted">{content.packages.body}</p>
        </div>
        {products.length ? (
          <CatalogProductGrid
            products={products}
            locale={locale}
            recommendedLabel={locale === "nl" ? "Aanbevolen" : "Recommended"}
            viewLabel={locale === "nl" ? "Bekijk product" : "View product"}
          />
        ) : (
          <div className="rounded-xl border border-light-border p-6 text-light-muted">
            <p className="mb-4">
              {locale === "nl"
                ? "Er zijn nog geen volledig goedgekeurde websiteproducten gepubliceerd."
                : "No fully approved website products have been published yet."}
            </p>
            <LocaleLinkButton href={paths.shop} variant="outline">
              {locale === "nl" ? "Bekijk de catalogus" : "View catalogue"}
            </LocaleLinkButton>
          </div>
        )}
      </Container>
    </Section>
  );
}
