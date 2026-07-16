import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utilities/cn";
import { Container, Section, Card, Badge } from "@/components/ui/container";
import {
  getAllProducts,
  getAllCategories,
  getProductsByCategory,
} from "@/server/repositories/products";
import { formatPriceLabel, billingPeriodLabel } from "@/lib/utilities/money";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { localizeProduct } from "@/i18n/localize-product";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths, withLocale } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  websitePackages,
  getPackageCatalogItem,
} from "@/config/commercial/website-packages";
import {
  commercialBundles,
  getBundleCatalogItem,
} from "@/config/commercial/bundles";
import { formatDualPrice } from "@/lib/utilities/commercial-price";

type BillingFilter = "all" | "one-time" | "monthly" | "quote-only";

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    categorie?: string;
    q?: string;
    billing?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("nav.shop"),
    description: t("shop.metaDescription"),
    alternates: buildLocaleAlternates(paths.shop, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

function matchesBilling(billingType: string, filter: BillingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "one-time") return billingType === "ONE_TIME";
  if (filter === "monthly") return billingType === "MONTHLY" || billingType === "YEARLY";
  if (filter === "quote-only") return billingType === "QUOTE_ONLY";
  return true;
}

function buildShopHref(opts: {
  category?: string;
  q?: string;
  billing?: BillingFilter;
}): string {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.q) params.set("q", opts.q);
  if (opts.billing && opts.billing !== "all") params.set("billing", opts.billing);
  const qs = params.toString();
  return qs ? `${paths.shop}?${qs}` : paths.shop;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const commercial = getCommercialContent(locale);
  const params = await searchParams;

  if (params.categorie && !params.category) {
    const qs = new URLSearchParams();
    qs.set("category", params.categorie);
    if (params.q) qs.set("q", params.q);
    if (params.billing) qs.set("billing", params.billing);
    redirect(withLocale(`${paths.shop}?${qs.toString()}`, locale));
  }

  const categorySlug = params.category ?? params.categorie;
  const query = (params.q ?? "").trim().toLowerCase();
  const billingRaw = params.billing ?? "all";
  const billingFilter: BillingFilter =
    billingRaw === "one-time" ||
    billingRaw === "monthly" ||
    billingRaw === "quote-only"
      ? billingRaw
      : "all";

  const categories = await getAllCategories();
  const activeCategory = categories.find((c) => c.slug === categorySlug)?.slug;
  const rawProducts = activeCategory
    ? await getProductsByCategory(activeCategory)
    : await getAllProducts();

  const products = rawProducts
    .map((product) => localizeProduct(product, locale))
    .filter((product) => matchesBilling(product.billingType, billingFilter))
    .filter((product) => {
      if (!query) return true;
      const haystack = `${product.name} ${product.shortDescription}`.toLowerCase();
      return haystack.includes(query);
    });

  const filterChips: { id: BillingFilter; label: string }[] = [
    { id: "all", label: t("shop.billingAll") },
    { id: "one-time", label: t("shop.billingOneTime") },
    { id: "monthly", label: t("shop.billingMonthly") },
    { id: "quote-only", label: t("shop.billingQuoteOnly") },
  ];

  const categoryFilters = (
    <div
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
      role="group"
      aria-label={t("shop.categories")}
    >
      <LocaleLink
        href={buildShopHref({ q: query || undefined, billing: billingFilter })}
        className={cn(
          "shrink-0 px-4 py-2.5 rounded-lg text-small border transition-colors min-h-10 inline-flex items-center",
          !activeCategory
            ? "bg-primary text-white border-primary"
            : "border-light-border text-light-muted hover:border-primary hover:text-primary",
        )}
      >
        {t("shop.all")}
      </LocaleLink>
      {categories.map((cat) => (
        <LocaleLink
          key={cat.slug}
          href={buildShopHref({
            category: cat.slug,
            q: query || undefined,
            billing: billingFilter,
          })}
          className={cn(
            "shrink-0 px-4 py-2.5 rounded-lg text-small border transition-colors min-h-10 inline-flex items-center",
            activeCategory === cat.slug
              ? "bg-primary text-white border-primary"
              : "border-light-border text-light-muted hover:border-primary hover:text-primary",
          )}
        >
          {cat.name}
        </LocaleLink>
      ))}
    </div>
  );

  const billingFilters = (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t("shop.filters")}
    >
      {filterChips.map((chip) => (
        <LocaleLink
          key={chip.id}
          href={buildShopHref({
            category: activeCategory,
            q: query || undefined,
            billing: chip.id,
          })}
          className={cn(
            "px-3 py-2 rounded-lg text-small border transition-colors min-h-10 inline-flex items-center",
            billingFilter === chip.id
              ? "bg-primary text-white border-primary"
              : "border-light-border text-light-muted hover:border-primary hover:text-primary",
          )}
        >
          {chip.label}
        </LocaleLink>
      ))}
    </div>
  );

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.shop")}</p>
          <h1 className="text-h1 mb-4">{t("shop.title")}</h1>
          <p className="text-body-lg text-muted prose-width">{t("shop.intro")}</p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-12">
          <form method="get" className="flex flex-col sm:flex-row gap-3">
            {activeCategory ? (
              <input type="hidden" name="category" value={activeCategory} />
            ) : null}
            {billingFilter !== "all" ? (
              <input type="hidden" name="billing" value={billingFilter} />
            ) : null}
            <label className="sr-only" htmlFor="shop-q">
              {t("shop.searchLabel")}
            </label>
            <input
              id="shop-q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder={t("shop.searchPlaceholder")}
              className="w-full min-h-11 px-4 py-3 text-base rounded-lg border border-light-border bg-light-surface text-light-foreground"
            />
            <button
              type="submit"
              className="min-h-11 px-5 rounded-lg bg-primary text-white text-small font-medium shrink-0"
            >
              {t("shop.searchLabel")}
            </button>
          </form>

          <div className="md:hidden">
            <details className="rounded-lg border border-light-border bg-light-surface">
              <summary className="cursor-pointer list-none px-4 py-3 text-small font-medium text-light-foreground [&::-webkit-details-marker]:hidden">
                {t("shop.filters")}
              </summary>
              <div className="space-y-4 border-t border-light-border px-4 py-4">
                {categoryFilters}
                {billingFilters}
              </div>
            </details>
          </div>

          <div className="hidden md:block space-y-4">
            {categoryFilters}
            {billingFilters}
          </div>

          <p className="text-xs text-light-muted">{t("shop.vatNote")}</p>

          <div>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("shop.websitePackages")}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {websitePackages.map((pkg) => {
                const copy = commercial.packages[pkg.i18nKey];
                const catalog = getPackageCatalogItem(pkg);
                const price = catalog ? formatDualPrice(catalog, locale) : null;
                return (
                  <Card key={pkg.id} variant="light" className="flex flex-col h-full">
                    <h3 className="text-h3 text-light-foreground mb-2">{copy.name}</h3>
                    <p className="text-small text-light-muted mb-4 flex-1">{copy.summary}</p>
                    {price ? (
                      <div className="mb-4 space-y-1">
                        <p className="text-sm font-medium text-primary">{price.exclLabel}</p>
                        {price.inclLabel ? (
                          <p className="text-xs text-light-muted">{price.inclLabel}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <LocaleLinkButton
                      href={`${paths.quote}?package=${pkg.slug}`}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center"
                    >
                      {t("shop.requestQuote")}
                    </LocaleLinkButton>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-h2 text-light-foreground mb-6">{t("shop.bundles")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {commercialBundles.map((bundle) => {
                const copy = commercial.bundles[bundle.i18nKey];
                const catalog = getBundleCatalogItem(bundle);
                const price = catalog ? formatDualPrice(catalog, locale) : null;
                return (
                  <Card key={bundle.id} variant="light" className="flex flex-col h-full">
                    <h3 className="text-h3 text-light-foreground mb-2">{copy.name}</h3>
                    <p className="text-small text-light-muted mb-4 flex-1">{copy.summary}</p>
                    {price ? (
                      <div className="mb-4 space-y-1">
                        <p className="text-sm font-medium text-primary">{price.exclLabel}</p>
                        {price.inclLabel ? (
                          <p className="text-xs text-light-muted">{price.inclLabel}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <LocaleLinkButton
                      href={`${paths.quote}?package=${bundle.slug}`}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center"
                    >
                      {t("shop.requestQuote")}
                    </LocaleLinkButton>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("shop.productsHeading")}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Card variant="light" className="text-center py-16 px-6">
                    <h3 className="text-h3 text-light-foreground mb-3">
                      {query
                        ? t("shop.noSearchResults")
                        : activeCategory
                          ? t("shop.emptyCategory")
                          : t("shop.emptyTitle")}
                    </h3>
                    <p className="text-body text-light-muted mb-6 max-w-xl mx-auto">
                      {activeCategory && !query
                        ? t("shop.emptyCategoryBody")
                        : t("shop.emptyBody")}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {activeCategory || query || billingFilter !== "all" ? (
                        <LocaleLinkButton href={paths.shop} variant="outline">
                          {t("shop.allProducts")}
                        </LocaleLinkButton>
                      ) : null}
                      <LocaleLinkButton href={paths.quote}>
                        {t("shop.requestQuote")}
                      </LocaleLinkButton>
                    </div>
                  </Card>
                </div>
              ) : (
                products.map((product) => {
                  const highlights = (product.includedItems ?? []).slice(0, 3);
                  return (
                    <LocaleLink key={product.id} href={`${paths.shop}/${product.slug}`}>
                      <Card
                        variant="light"
                        className="h-full hover:border-primary/40 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-label text-light-muted">
                            {product.categoryName}
                          </span>
                          {product.featured ? (
                            <Badge>{t("shop.recommended")}</Badge>
                          ) : null}
                        </div>
                        <h3 className="text-h3 text-light-foreground mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-small text-light-muted mb-3 line-clamp-2">
                          {product.shortDescription}
                        </p>
                        {highlights.length > 0 ? (
                          <ul className="mb-3 space-y-1">
                            {highlights.map((item) => (
                              <li
                                key={item}
                                className="text-xs text-light-muted line-clamp-1 before:content-['•'] before:mr-1.5"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-auto space-y-1">
                          <p className="font-semibold text-primary">
                            {formatPriceLabel(
                              product.priceCents,
                              product.fromPriceCents,
                              product.billingType,
                              locale,
                            )}
                          </p>
                          <p className="text-xs text-light-muted">
                            {billingPeriodLabel(product.billingType, locale)}
                            {product.deliveryTime
                              ? ` · ${t("shop.deliveryTime")}: ${product.deliveryTime}`
                              : null}
                          </p>
                        </div>
                      </Card>
                    </LocaleLink>
                  );
                })
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
