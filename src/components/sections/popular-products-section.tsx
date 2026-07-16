import { Container, Card, Section } from "@/components/ui/container";
import { formatPriceLabel } from "@/lib/utilities/money";
import type { Product } from "@/types";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LocaleLink } from "@/i18n/locale-link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { localizeProduct } from "@/i18n/localize-product";
import { paths } from "@/i18n/config";

interface PopularProductsSectionProps {
  products: Product[];
}

export async function PopularProductsSection({ products }: PopularProductsSectionProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const featured = products.slice(0, 6).map((product) => localizeProduct(product, locale));

  return (
    <Section variant="dark">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-label text-primary mb-3">{t("nav.shop")}</p>
            <h2 className="text-h2">{t("shop.popular")}</h2>
          </div>
          <LocaleLinkButton href={paths.shop} variant="outline">
            {t("shop.allProducts")}
          </LocaleLinkButton>
        </div>

        {featured.length === 0 ? (
          <Card className="text-center py-12 px-6">
            <h3 className="text-h3 mb-3">{t("shop.popularEmptyTitle")}</h3>
            <p className="text-muted mb-6 max-w-lg mx-auto">{t("shop.popularEmptyBody")}</p>
            <LocaleLinkButton href={paths.quote}>{t("shop.requestQuote")}</LocaleLinkButton>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((product) => (
              <LocaleLink key={product.id} href={`${paths.shop}/${product.slug}`}>
                <Card className="h-full hover:border-primary/40 transition-colors group">
                  <p className="text-label text-muted mb-2">{product.categoryName}</p>
                  <h3 className="text-h3 mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-small text-muted mb-4 line-clamp-2">
                    {product.shortDescription}
                  </p>
                  <p className="text-body font-semibold text-primary">
                    {formatPriceLabel(
                      product.priceCents,
                      product.fromPriceCents,
                      product.billingType,
                      locale,
                    )}
                  </p>
                </Card>
              </LocaleLink>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
