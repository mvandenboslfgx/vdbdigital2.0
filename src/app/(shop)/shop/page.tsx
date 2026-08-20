import type { Metadata } from "next";
import { Card, Container, Section } from "@/components/ui/container";
import { CatalogProductGrid } from "@/components/shop/catalog-product-grid";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { cn } from "@/lib/utilities/cn";
import { queryPublicShopCatalog } from "@/server/repositories/public-shop-catalog";

interface ShopPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    billing?: string;
    page?: string;
  }>;
}

type BillingFilter = "all" | "one-time" | "recurring" | "quote-only";

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

function shopHref(input: {
  q?: string;
  category?: string;
  billing?: BillingFilter;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.category && input.category !== "all") params.set("category", input.category);
  if (input.billing && input.billing !== "all") params.set("billing", input.billing);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return params.size ? `${paths.shop}?${params}` : paths.shop;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() || "all";
  const billing: BillingFilter =
    params.billing === "one-time" ||
    params.billing === "recurring" ||
    params.billing === "quote-only"
      ? params.billing
      : "all";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);

  const catalog = await queryPublicShopCatalog({
    q: q || undefined,
    category,
    billing,
    page,
    pageSize: 12,
  });
  const products = catalog.items;
  const billingFilters: Array<{ id: BillingFilter; label: string }> = [
    { id: "all", label: t("shop.billingAll") },
    { id: "one-time", label: t("shop.billingOneTime") },
    { id: "recurring", label: t("shop.billingMonthly") },
    { id: "quote-only", label: t("shop.billingQuoteOnly") },
  ];

  return (
    <>
      <Section variant="dark" className="pb-10 pt-12">
        <Container>
          <p className="text-label mb-3 text-primary">{t("nav.shop")}</p>
          <h1 className="text-h1 mb-4">{t("shop.title")}</h1>
          <p className="text-body-lg prose-width text-muted">{t("shop.intro")}</p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-8">
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
            {billing !== "all" ? <input type="hidden" name="billing" value={billing} /> : null}
            <label className="sr-only" htmlFor="shop-search">
              {t("shop.searchLabel")}
            </label>
            <input
              id="shop-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("shop.searchPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-light-border bg-light-surface px-4 py-3 text-base text-light-foreground"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-lg bg-primary px-5 text-small font-medium text-white"
            >
              {t("shop.searchLabel")}
            </button>
          </form>

          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("shop.categories")}>
              <LocaleLink
                href={shopHref({ q, billing })}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-lg border px-4 py-2.5 text-small",
                  category === "all"
                    ? "border-primary bg-primary text-white"
                    : "border-light-border text-light-muted",
                )}
              >
                {t("shop.all")}
              </LocaleLink>
              {catalog.categories.map((item) => (
                <LocaleLink
                  key={item.slug}
                  href={shopHref({ q, category: item.slug, billing })}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center rounded-lg border px-4 py-2.5 text-small",
                    category === item.slug
                      ? "border-primary bg-primary text-white"
                      : "border-light-border text-light-muted",
                  )}
                >
                  {locale === "nl" ? item.nameNl || item.name : item.name} ({item.count})
                </LocaleLink>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label={t("shop.filters")}>
              {billingFilters.map((filter) => (
                <LocaleLink
                  key={filter.id}
                  href={shopHref({ q, category, billing: filter.id })}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-small",
                    billing === filter.id
                      ? "border-primary bg-primary text-white"
                      : "border-light-border text-light-muted",
                  )}
                >
                  {filter.label}
                </LocaleLink>
              ))}
            </div>
          </div>

          <p className="text-xs text-light-muted">{t("shop.vatNote")}</p>

          {products.length ? (
            <CatalogProductGrid
              products={products}
              locale={locale}
              recommendedLabel={t("shop.recommended")}
              viewLabel={locale === "nl" ? "Bekijk product" : "View product"}
            />
          ) : (
            <Card variant="light" className="px-6 py-16 text-center">
              <h2 className="text-h3 mb-3 text-light-foreground">
                {q ? t("shop.noSearchResults") : t("shop.emptyTitle")}
              </h2>
              <p className="text-body mx-auto mb-6 max-w-xl text-light-muted">
                {t("shop.emptyBody")}
              </p>
              <LocaleLinkButton href={paths.quote}>{t("shop.requestQuote")}</LocaleLinkButton>
            </Card>
          )}

          {catalog.totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
              {catalog.page > 1 ? (
                <LocaleLinkButton
                  href={shopHref({ q, category, billing, page: catalog.page - 1 })}
                  variant="outline"
                >
                  {locale === "nl" ? "Vorige" : "Previous"}
                </LocaleLinkButton>
              ) : null}
              <span className="text-small text-light-muted">
                {catalog.page} / {catalog.totalPages}
              </span>
              {catalog.page < catalog.totalPages ? (
                <LocaleLinkButton
                  href={shopHref({ q, category, billing, page: catalog.page + 1 })}
                  variant="outline"
                >
                  {locale === "nl" ? "Volgende" : "Next"}
                </LocaleLinkButton>
              ) : null}
            </nav>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
