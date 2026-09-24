"use client";

import { useActionState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AddressAutocompleteFields } from "@/components/forms/address-autocomplete-fields";
import { submitCheckoutAction } from "@/server/actions/checkout-actions";
import { formatCents } from "@/lib/utilities/money";
import { useI18n, useT } from "@/i18n/provider";
import { useLocalizedHref } from "@/i18n/use-localized-href";
import type { BillingType, OrderTotals } from "@/types";

interface CheckoutFormProps {
  totals: OrderTotals;
  mollieConfigured: boolean;
  recurringBillingType?: BillingType | null;
}

export function CheckoutForm({
  totals,
  mollieConfigured,
  recurringBillingType,
}: CheckoutFormProps) {
  const t = useT();
  const { locale } = useI18n();
  const localizeHref = useLocalizedHref();
  const termsHref = localizeHref("/terms");
  const [state, action, pending] = useActionState(submitCheckoutAction, null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset className="space-y-2">
        <legend className="text-small font-medium text-foreground">{t("checkout.customerType")}</legend>
        <label className="flex items-center gap-2 text-small">
          <input type="radio" name="customerType" value="B2B" required defaultChecked />
          <span>{t("checkout.customerTypeB2b")}</span>
        </label>
        <label className="flex items-center gap-2 text-small">
          <input type="radio" name="customerType" value="B2C" />
          <span>{t("checkout.customerTypeB2c")}</span>
        </label>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input name="firstName" label={t("checkout.firstName")} required />
        <Input name="lastName" label={t("checkout.lastName")} required />
      </div>
      <Input name="email" label={t("checkout.emailAddress")} type="email" required />
      <Input name="company" label={t("checkout.companyName")} />
      <Input name="phone" label={t("checkout.phoneNumber")} type="tel" />
      <Input name="vatNumber" label={t("checkout.vatNumber")} />
      <AddressAutocompleteFields
        addressLabel={t("checkout.address")}
        postalCodeLabel={t("checkout.postalCode")}
        cityLabel={t("checkout.city")}
      />
      <Textarea name="notes" label={t("checkout.notes")} rows={3} />
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {recurringBillingType ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="font-semibold text-foreground mb-1">
            {t("checkout.subscriptionTitle")}
          </p>
          <p className="text-small text-muted">
            {t(
              recurringBillingType === "YEARLY"
                ? "checkout.subscriptionDisclosureYearly"
                : "checkout.subscriptionDisclosureMonthly",
              { amount: formatCents(totals.totalCents) },
            )}
          </p>
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-small">
        <input type="checkbox" name="acceptTerms" value="true" required className="mt-1" />
        <span>
          {t("checkout.acceptTermsPrefix")}{" "}
          <a href={termsHref} className="text-primary underline" target="_blank" rel="noreferrer">
            {t("checkout.termsLink")}
          </a>
        </span>
      </label>
      <label className="flex items-start gap-3 text-small">
        <input
          type="checkbox"
          name="marketingConsent"
          value="true"
          className="mt-1"
        />
        <span>{t("checkout.marketingConsent")}</span>
      </label>

      {!mollieConfigured && (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/10 text-small">
          {t("checkout.mollieNotConfigured")}
        </div>
      )}

      {state?.errors && (
        <div
          className="p-4 rounded-lg border border-danger/30 bg-danger/10 text-danger text-small"
          role="alert"
        >
          {state.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <span className="font-semibold">
          {t("checkout.totalInclVat")}: {formatCents(totals.totalCents)}
        </span>
        <Button type="submit" disabled={pending || !mollieConfigured} size="lg">
          {pending
            ? t("checkout.processing")
            : recurringBillingType
              ? t("checkout.startSubscription")
              : t("checkout.payWithMollie")}
        </Button>
      </div>
    </form>
  );
}
