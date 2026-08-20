import { Badge, Card } from "@/components/ui/container";
import { ProductImage } from "@/components/shop/product-image";
import type { Locale } from "@/i18n/config";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { localizeProduct } from "@/i18n/localize-product";
import { publicShopPriceDisplay } from "@/lib/commerce/public-shop-gates";
import { billingPeriodLabel } from "@/lib/utilities/money";
import type { Product } from "@/types";

export function CatalogProductGrid({
  products,
  locale,
  recommendedLabel,
  viewLabel,
}: {
  products: Product[];
  locale: Locale;
  recommendedLabel: string;
  viewLabel: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((rawProduct) => {
        const product = localizeProduct(rawProduct, locale);
        const price = publicShopPriceDisplay(product, locale);
        const quantityLabel =
          locale === "nl" ? product.quantityLabelNl : product.quantityLabelEn;

        return (
          <LocaleLink key={product.id} href={`${paths.shop}/${product.slug}`}>
            <Card
              variant="light"
              data-catalog-product-card
              className="group flex h-full min-w-0 flex-col overflow-hidden p-0 transition-colors hover:border-primary/40"
            >
              <ProductImage
                src={product.imageUrl}
                alt={product.imageAlt || product.name}
                className="rounded-t-xl"
              />
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="text-label text-light-muted">{product.categoryName}</span>
                  {product.featured ? <Badge>{recommendedLabel}</Badge> : null}
                </div>
                <h2 className="text-h3 mb-2 text-light-foreground transition-colors group-hover:text-primary">
                  {product.name}
                </h2>
                <p className="text-small mb-5 line-clamp-3 flex-1 text-light-muted">
                  {product.shortDescription}
                </p>
                <p className="font-semibold text-primary">{price.label}</p>
                {price.mode !== "on_request" ? (
                  <p className="mt-1 text-xs text-light-muted">
                    {locale === "nl" ? "per" : "per"} {quantityLabel || "item"} ·{" "}
                    {billingPeriodLabel(product.billingType, locale)}
                  </p>
                ) : null}
                <span
                  className="mt-5 inline-flex min-h-11 items-center text-small font-medium text-primary"
                  data-catalog-product-cta
                >
                  {viewLabel} →
                </span>
              </div>
            </Card>
          </LocaleLink>
        );
      })}
    </div>
  );
}
