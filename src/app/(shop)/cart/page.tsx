import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { getCart, validateCartItems } from "@/features/cart/cart-service";
import { formatCents } from "@/lib/utilities/money";
import { calculateOrderTotals, sumLineItems } from "@/lib/utilities/vat";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { LocaleLink } from "@/i18n/locale-link";
import { RemoveFromCartButton } from "@/components/shop/remove-from-cart-button";
import { CartQuantityControls } from "@/components/shop/cart-quantity-controls";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { isDirectCheckoutEnabled } from "@/config/features";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("cart.title"),
    alternates: { canonical: paths.cart },
    robots: { index: false },
  };
}

export default async function CartPage() {
  const { t } = await getDictionary();
  const checkoutOn = isDirectCheckoutEnabled();
  const cart = await getCart();
  const { items, errors } = await validateCartItems(cart);

  const subtotal = sumLineItems(
    items.map((i) => ({ unitPriceCents: i.validatedPriceCents, quantity: i.quantity })),
  );
  const totals = calculateOrderTotals(subtotal);
  const showEmpty =
    cart.items.length === 0 || (!checkoutOn && items.length === 0);

  return (
    <Section variant="dark" className="pt-12 min-h-[60vh]">
      <Container>
        <h1 className="text-h1 mb-8">{t("cart.title")}</h1>

        {!checkoutOn && (
          <Card className="mb-6 space-y-3">
            <p className="text-muted">
              Directe online betaling is momenteel uitgeschakeld. Bekijk producten in de shop
              en vraag een offerte aan of neem contact op.
            </p>
            <div className="flex flex-wrap gap-3">
              <LocaleLinkButton href={paths.shop}>{t("cart.toShop")}</LocaleLinkButton>
              <LocaleLinkButton href={paths.quote} variant="outline">
                {t("nav.quote")}
              </LocaleLinkButton>
              <LocaleLinkButton href={paths.contact} variant="ghost">
                {t("nav.contact")}
              </LocaleLinkButton>
            </div>
          </Card>
        )}

        {showEmpty ? (
          <Card className="text-center py-12 space-y-4">
            <p className="text-muted">
              {checkoutOn ? t("cart.empty") : "Er zijn geen afrekenbare artikelen beschikbaar."}
            </p>
            <LocaleLinkButton href={paths.shop}>{t("cart.toShop")}</LocaleLinkButton>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {errors.length > 0 && (
                <div className="p-4 rounded-lg border border-danger/30 bg-danger/10 text-danger text-small">
                  {errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
              {items.map((item) => (
                <Card key={item.productId} className="flex justify-between items-start gap-4">
                  <div>
                    <LocaleLink
                      href={`${paths.shop}/${item.productSlug}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.name}
                    </LocaleLink>
                    <p className="text-small text-muted mt-1">
                      {formatCents(item.validatedPriceCents)} {t("cart.perItem")}
                    </p>
                    <CartQuantityControls productId={item.productId} quantity={item.quantity} />
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCents(item.validatedPriceCents * item.quantity)}
                    </p>
                    <RemoveFromCartButton productId={item.productId} />
                  </div>
                </Card>
              ))}
            </div>

            <Card>
              <h2 className="text-h3 mb-4">{t("cart.overview")}</h2>
              <dl className="space-y-2 text-small">
                <div className="flex justify-between">
                  <dt className="text-muted">{t("cart.subtotal")}</dt>
                  <dd>{formatCents(totals.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t("cart.vat")}</dt>
                  <dd>{formatCents(totals.vatCents)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
                  <dt>{t("cart.total")}</dt>
                  <dd>{formatCents(totals.totalCents)}</dd>
                </div>
              </dl>
              {checkoutOn && items.length > 0 && errors.length === 0 ? (
                <LocaleLinkButton href={paths.checkout} className="w-full mt-6">
                  {t("cart.checkout")}
                </LocaleLinkButton>
              ) : (
                <LocaleLinkButton href={paths.quote} className="w-full mt-6">
                  {t("shop.requestQuote")}
                </LocaleLinkButton>
              )}
            </Card>
          </div>
        )}
      </Container>
    </Section>
  );
}
