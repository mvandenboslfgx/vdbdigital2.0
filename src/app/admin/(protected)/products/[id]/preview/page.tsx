import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminProductById } from "@/server/repositories/admin-products";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { formatPriceLabel } from "@/lib/utilities/money";
import {
  getCheckoutBlockLabelsNl,
  resolveStoredOrDerivedPriceMode,
} from "@/lib/commerce/catalog-admin-eligibility";
import { StatusBadge, PriceModeBadge, EligibilityBadge } from "@/components/admin/catalog-badges";
import { isDirectlySellableServerSide } from "@/lib/commerce/catalog-admin-eligibility";
import { mergeProductForLocale } from "@/lib/commerce/product-locale-merge";
import { TRANSLATION_STATUS_SHORT_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, locales, withLocale, type Locale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.productPreview.title"),
    robots: { index: false, follow: false },
  };
}

const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
};

export default async function AdminProductPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { t, locale: uiLocale } = await getDictionary();
  const { id } = await params;
  const { locale: requestedLocale } = await searchParams;
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) redirect("/admin");

  const product = await getAdminProductById(id);
  if (!product) notFound();

  // Which storefront locale we are previewing — independent of the locale the
  // admin UI itself is rendered in.
  const previewLocale: Locale =
    requestedLocale && isLocale(requestedLocale) ? requestedLocale : "en";
  const previewLocaleName = LOCALE_DISPLAY_NAMES[previewLocale];

  const translationRow =
    product.translations?.find((row) => row.locale === previewLocale) ?? null;

  /*
   * Preview goes through the exact same gate as the storefront, with
   * allowApprovedPreview so a reviewer can see 'approved' copy before it is
   * published. Anything below 'approved' — including machine_translated —
   * still falls back to the English source here, so the preview can never
   * flatter a translation that a visitor would not actually receive.
   */
  const merged = mergeProductForLocale(product, previewLocale, translationRow, {
    allowApprovedPreview: true,
  });

  if (!merged) {
    return (
      <div className="space-y-6">
        <h1 className="text-h1">{t("admin.page.productPreview.title")}</h1>
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-950">
          {t("admin.page.productPreview.unavailable")}
        </p>
      </div>
    );
  }

  const previewProduct = merged.product;
  const reasons = getCheckoutBlockLabelsNl(product, "B2B");
  const sellable = isDirectlySellableServerSide(product);
  const mode = resolveStoredOrDerivedPriceMode(product);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-small text-muted mb-1">
            <Link
              href={withLocale(`/admin/products/${product.id}`, uiLocale)}
              className="hover:text-foreground"
            >
              {t("admin.page.productPreview.backToEdit")}
            </Link>
          </p>
          <h1 className="text-h1">
            {t("admin.page.productPreview.heading", { name: product.name })}
          </h1>
          <p className="text-small text-muted mt-1">
            {t("admin.page.productPreview.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={product.status} />
          <PriceModeBadge mode={mode} />
          <EligibilityBadge sellable={sellable} />
        </div>
      </div>

      <section className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="font-semibold">{t("admin.page.productPreview.localeHeading")}</h2>
        <div className="flex flex-wrap gap-2">
          {locales.map((code) => (
            <Link
              key={code}
              href={withLocale(
                `/admin/products/${product.id}/preview?locale=${code}`,
                uiLocale,
              )}
              aria-current={code === previewLocale ? "page" : undefined}
              className={`min-h-11 inline-flex items-center rounded-lg border px-4 text-sm ${
                code === previewLocale
                  ? "border-primary text-primary"
                  : "border-border hover:border-primary"
              }`}
            >
              {LOCALE_DISPLAY_NAMES[code]}
            </Link>
          ))}
        </div>
        <p className="text-small text-muted">
          {t("admin.page.productPreview.localeHint")}
        </p>
        <p className="text-small">
          {merged.translationApplied
            ? t("admin.page.productPreview.localeApplied", {
                locale: previewLocaleName,
                status: labelFor(
                  t,
                  TRANSLATION_STATUS_SHORT_KEYS,
                  merged.usedStatus ?? "draft",
                ),
              })
            : t("admin.page.productPreview.localeFallback", {
                locale: previewLocaleName,
              })}
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small">
        {t("admin.page.productPreview.checkoutDisabled")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-semibold">{t("admin.page.productPreview.desktopView")}</h2>
          <p className="text-small text-muted">{product.categoryName}</p>
          <h3 className="text-2xl font-display">{previewProduct.name}</h3>
          <p>{previewProduct.shortDescription}</p>
          <p className="text-primary font-medium text-lg">
            {formatPriceLabel(
              previewProduct.priceCents,
              previewProduct.fromPriceCents,
              previewProduct.billingType,
              previewLocale,
            )}
          </p>
          <button
            type="button"
            disabled
            className="min-h-11 px-5 rounded-lg bg-primary text-white opacity-60 cursor-not-allowed"
          >
            {previewProduct.ctaLabel ||
              previewProduct.quoteCtaLabel ||
              t("admin.page.productPreview.quoteCta")}
          </button>
          <div className="prose prose-sm max-w-none text-small whitespace-pre-wrap">
            {previewProduct.fullDescription}
          </div>
          {(previewProduct.benefits?.length ?? 0) > 0 && (
            <ul className="list-disc pl-5 text-small space-y-1">
              {previewProduct.benefits?.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4 max-w-sm mx-auto w-full">
          <h2 className="font-semibold">{t("admin.page.productPreview.mobileView")}</h2>
          <div className="rounded-[1.5rem] border-2 border-border p-4 space-y-3 bg-surface">
            <p className="text-xs text-muted">{product.categoryName}</p>
            <h3 className="text-xl font-display">{previewProduct.name}</h3>
            <p className="text-small">{previewProduct.shortDescription}</p>
            <p className="font-medium text-primary">
              {formatPriceLabel(
                previewProduct.priceCents,
                previewProduct.fromPriceCents,
                previewProduct.billingType,
                previewLocale,
              )}
            </p>
            <button
              type="button"
              disabled
              className="w-full min-h-11 rounded-lg bg-primary text-white opacity-60 cursor-not-allowed text-sm"
            >
              {previewProduct.quoteCtaLabel ||
                t("admin.page.productPreview.quoteCtaShort")}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="font-semibold mb-2">
          {t("admin.page.productPreview.eligibilityHeading")}
        </h2>
        <ul className="text-small space-y-1 text-muted">
          {reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
