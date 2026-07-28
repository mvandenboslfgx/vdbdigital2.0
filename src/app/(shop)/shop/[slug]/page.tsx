import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Card } from "@/components/ui/container";
import { getProductBySlug } from "@/server/repositories/products";
import { formatPriceLabel, billingPeriodLabel } from "@/lib/utilities/money";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { localizeProduct } from "@/i18n/localize-product";
import { buildLocaleAlternates } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { productAllowsAddToCart } from "@/lib/commerce/product-checkout-ui";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const raw = await getProductBySlug(slug);
  if (!raw) return { title: t("product.notFound") };
  const product = localizeProduct(raw, locale);
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: buildLocaleAlternates(`${paths.shop}/${slug}`, locale),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const raw = await getProductBySlug(slug);
  if (!raw) notFound();
  const product = localizeProduct(raw, locale);

  const whatsappMessage = t("product.whatsappMessage", { product: product.name });
  const canAddToCart = productAllowsAddToCart(raw);

  return (
    <>
      <Section variant="dark" className="pt-12">
        <Container>
          <p className="text-label text-primary mb-3">{product.categoryName}</p>
          <h1 className="text-h1 mb-4">{product.name}</h1>
          <p className="text-body-lg text-muted prose-width mb-6">{product.shortDescription}</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-2xl font-semibold text-primary">
              {formatPriceLabel(
                product.priceCents,
                product.fromPriceCents,
                product.billingType,
                locale,
              )}
            </span>
            <span className="text-small text-muted">
              {t("product.billing")}: {billingPeriodLabel(product.billingType, locale)}
            </span>
          </div>
        </Container>
      </Section>

      <Section variant="light">
        <Container>
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="text-h2 text-light-foreground mb-4">{t("product.description")}</h2>
                <p className="text-light-muted">{product.fullDescription}</p>
              </div>

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
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.deliveryTime")}</p>
                  <p className="font-medium text-light-foreground">{product.deliveryTime}</p>
                </div>
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.targetAudience")}</p>
                  <p className="text-small text-light-muted">{product.targetAudience}</p>
                </div>
                <div>
                  <p className="text-label text-light-muted mb-1">{t("product.workflow")}</p>
                  <p className="text-small text-light-muted">{product.workflow}</p>
                </div>
                <div className="pt-4 border-t border-light-border space-y-3">
                  {canAddToCart && <AddToCartButton productSlug={product.slug} />}
                  <LocaleLinkButton
                    href={`${paths.quote}?product=${product.slug}`}
                    variant="outline"
                    className="w-full"
                  >
                    {t("shop.requestQuote")}
                  </LocaleLinkButton>
                  <WhatsAppButton
                    message={whatsappMessage}
                    label={t("forms.whatsapp")}
                    className="w-full justify-center"
                  />
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
