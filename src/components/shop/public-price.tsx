import type { Locale } from "@/i18n/config";
import { publicShopPriceDisplay } from "@/lib/commerce/public-shop-gates";
import type { Product } from "@/types";

export function PublicPrice({
  product,
  locale,
  className,
}: {
  product: Product;
  locale: Locale;
  className?: string;
}) {
  const price = publicShopPriceDisplay(product, locale);

  if (price.mode === "legal_sale" && price.compareLabel) {
    return (
      <div>
        <p className="text-small text-muted line-through">{price.compareLabel}</p>
        <p className={`font-semibold text-primary ${className ?? ""}`}>
          {price.nowPrefix} {price.label}
          {price.discountLabel ? ` — ${price.discountLabel}` : ""}
        </p>
      </div>
    );
  }

  if (price.mode === "benchmark" && price.marketLabel) {
    return (
      <div>
        <p className="text-small text-muted">
          {locale === "nl" ? "Marktwaarde" : "Market value"}: {price.marketLabel}
        </p>
        <p className={`font-semibold text-primary ${className ?? ""}`}>
          {locale === "nl" ? "VDB-prijs" : "VDB price"}: {price.label}
        </p>
      </div>
    );
  }

  return <p className={`font-semibold text-primary ${className ?? ""}`}>{price.label}</p>;
}
