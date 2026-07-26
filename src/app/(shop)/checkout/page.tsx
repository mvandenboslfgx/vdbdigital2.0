import type { Metadata } from "next";
import { Container, Section, Card } from "@/components/ui/container";
import { getCart, validateCartItems } from "@/features/cart/cart-service";
import { calculateOrderTotals, sumLineItems } from "@/lib/utilities/vat";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { isMollieConfigured } from "@/lib/payments/mollie";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { redirect } from "next/navigation";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { paths } from "@/i18n/config";
import { isDirectCheckoutEnabled } from "@/config/features";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("checkout.title"),
    alternates: { canonical: paths.checkout },
  };
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  if (!isDirectCheckoutEnabled()) {
    redirect(paths.shop);
  }

  const cart = await getCart();
  if (cart.items.length === 0) {
    redirect(paths.cart);
  }

  const { items, errors } = await validateCartItems(cart);
  if (items.length === 0 || errors.length > 0) {
    redirect(paths.cart);
  }

  const subtotal = sumLineItems(
    items.map((i) => ({ unitPriceCents: i.validatedPriceCents, quantity: i.quantity })),
  );
  const totals = calculateOrderTotals(subtotal);

  return (
    <Section variant="dark" className="pt-12">
      <Container className="max-w-2xl">
        <h1 className="text-h1 mb-8">{t("checkout.title")}</h1>
        <Card>
          <MessagesProvider locale={locale} messages={messages}>
            <CheckoutForm totals={totals} mollieConfigured={isMollieConfigured()} />
          </MessagesProvider>
        </Card>
        <p className="text-center mt-4">
          <LocaleLinkButton href={paths.cart} variant="ghost" size="sm">
            {t("checkout.backToCart")}
          </LocaleLinkButton>
        </p>
      </Container>
    </Section>
  );
}
