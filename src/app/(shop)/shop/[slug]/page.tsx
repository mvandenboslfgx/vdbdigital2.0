import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Card } from "@/components/ui/container";
import { getPublicShopProductBySlug } from "@/server/repositories/public-shop-catalog";
import { billingPeriodLabel } from "@/lib/utilities/money";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { localizeProduct } from "@/i18n/localize-product";
import { buildLocaleAlternates } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { productAllowsAddToCart } from "@/lib/commerce/product-checkout-ui";
import { PublicPrice } from "@/components/shop/public-price";
import { publicShopPriceDisplay } from "@/lib/commerce/public-shop-gates";
import { ProductImage } from "@/components/shop/product-image";
import { formatCents } from "@/lib/utilities/money";
import { resolvePublicPrice } from "@/lib/commerce/canonical-pricing";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ quantity?: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const raw = await getPublicShopProductBySlug(slug);
  if (!raw) return { title: t("product.notFound") };
  const product = localizeProduct(raw, locale);
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: buildLocaleAlternates(`${paths.shop}/${slug}`, locale),
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const raw = await getPublicShopProductBySlug(slug);
  if (!raw) notFound();
  const product = localizeProduct(raw, locale);

  const whatsappMessage = t("product.whatsappMessage", { product: product.name });
  const canAddToCart = productAllowsAddToCart(raw);
  const price = publicShopPriceDisplay(product, locale);
  const customerUnitCents = resolvePublicPrice({
    priceMode: product.priceMode,
    marketPriceCents: product.marketPriceCents,
    retailPriceCents: product.retailPriceCents ?? product.priceCents,
    salePriceCents: product.salePriceCents,
    saleStartsAt: product.saleStartsAt,
    saleEndsAt: product.saleEndsAt,
    lowestPrice30dCents: product.lowestPrice30dCents,
  }).customerPriceCents;
  const minQuantity = product.minQuantity ?? 1;
  const maxQuantity = product.maxQuantity ?? 99;
  const requestedQuantity = Number(query.quantity ?? minQuantity);
  const quantity = Number.isInteger(requestedQuantity)
    ? Math.min(Math.max(requestedQuantity, minQuantity), maxQuantity)
    : minQuantity;
  const quantityLabel =
    locale === "nl" ? product.quantityLabelNl || "licentie" : product.quantityLabelEn || "license";
  const totalLabel =
    product.priceMode === "FIXED" && customerUnitCents
      ? formatCents(customerUnitCents * quantity, locale)
      : null;

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-label text-primary mb-3">{product.categoryName}</p>
              <h1 className="text-h1 mb-4">{product.name}</h1>
              <p className="text-body-lg text-muted prose-width mb-6">{product.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-4">
                <PublicPrice product={product} locale={locale} className="text-2xl" />
                {price.mode !== "on_request" ? (
                  <span className="text-small text-muted">
                    {locale === "nl" ? `per ${quantityLabel}` : `per ${quantityLabel}`} ·{" "}
                    {billingPeriodLabel(product.billingType, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <ProductImage
              src={product.imageUrl}
              alt={product.imageAlt || product.name}
              priority
              className="rounded-2xl border border-white/10"
            />
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {product.fullDescription?.trim() ? (
              <div>
                <h2 className="text-h2 text-light-foreground mb-4">{t("product.description")}</h2>
                <p className="text-light-muted">{product.fullDescription}</p>
              </div>
              ) : null}

              {product.includedItems.length > 0 ? (
              <div>
                <h2 className="text-h2 text-light-foreground mb-4">{t("product.whatYouGet")}</h2>
                <ul className="space-y-2">
                  {product.includedItems.map((item) => (
                    <li key={item} className="flex gap-2 text-light-muted">
                      <span className="text-primary">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}

              {product.excludedItems.length > 0 ? (
              <div>
                <h2 className="text-h2 text-light-foreground mb-4">{t("product.notIncluded")}</h2>
                <ul className="space-y-2">
                  {product.excludedItems.map((item) => (
                    <li key={item} className="flex gap-2 text-light-muted">
                      <span className="text-light-muted">—</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}

              {product.extensions.length > 0 && (
                <div>
                  <h2 className="text-h2 text-light-foreground mb-4">{t("product.extensions")}</h2>
                  <ul className="space-y-2">
                    {product.extensions.map((ext) => (
                      <li key={ext} className="text-light-muted">
                        + {ext}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.faqs.length > 0 && (
                <div>
                  <h2 className="text-h2 text-light-foreground mb-4">{t("product.faqs")}</h2>
                  <div className="space-y-4">
                    {product.faqs.map((faq) => (
                      <Card key={faq.question} variant="light">
                        <h3 className="font-semibold text-light-foreground mb-2">{faq.question}</h3>
                        <p className="text-small text-light-muted">{faq.answer}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Card variant="light" className="sticky top-24 space-y-4">
                {product.deliveryTime?.trim() ? (
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.deliveryTime")}</p>
                  <p className="font-medium text-light-foreground">{product.deliveryTime}</p>
                </div>
                ) : null}
                {product.targetAudience?.trim() ? (
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.targetAudience")}</p>
                  <p className="text-small text-light-muted">{product.targetAudience}</p>
                </div>
                ) : null}
                {product.workflow?.trim() ? (
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.workflow")}</p>
                  <p className="text-small text-light-muted">{product.workflow}</p>
                </div>
                ) : null}
                <div className="pt-4 border-t border-light-border space-y-3">
                  <form method="get" className="space-y-2">
                    <label className="text-label text-light-muted" htmlFor="product-quantity">
                      {locale === "nl" ? "Aantal licenties" : "Number of licences"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="product-quantity"
                        name="quantity"
                        type="number"
                        min={minQuantity}
                        max={maxQuantity}
                        defaultValue={quantity}
                        className="min-h-11 min-w-0 flex-1 rounded-lg border border-light-border bg-light-surface px-3 text-light-foreground"
                      />
                      <button
                        type="submit"
                        className="min-h-11 rounded-lg border border-light-border px-3 text-small font-medium text-light-foreground"
                      >
                        {locale === "nl" ? "Bereken" : "Calculate"}
                      </button>
                    </div>
                    <p className="text-xs text-light-muted">
                      {locale === "nl"
                        ? `Toegestaan: ${minQuantity}–${maxQuantity}`
                        : `Allowed: ${minQuantity}–${maxQuantity}`}
                    </p>
                  </form>
                  {totalLabel ? (
                    <div className="rounded-lg bg-light-surface p-3">
                      <p className="text-label text-light-muted">
                        {locale === "nl" ? "Totaal voor deze periode" : "Total for this period"}
                      </p>
                      <p className="text-xl font-semibold text-primary">{totalLabel}</p>
                    </div>
                  ) : null}
                  {canAddToCart && (
                    <AddToCartButton
                      productSlug={product.slug}
                      quantity={quantity}
                      minQuantity={minQuantity}
                      maxQuantity={maxQuantity}
                    />
                  )}
                  <LocaleLinkButton
                    href={`${paths.quote}?product=${product.slug}&quantity=${quantity}`}
                    variant="outline"
                    className="w-full"
                  >
                    {t("shop.requestQuote")}
                  </LocaleLinkButton>
                  <WhatsAppButton message={whatsappMessage} className="w-full justify-center" />
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
