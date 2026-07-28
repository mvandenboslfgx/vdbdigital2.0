import type { Metadata } from "next";
import Image from "next/image";
import { cn } from "@/lib/utilities/cn";
import { Container, Section, Card } from "@/components/ui/container";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import {
  publicShopCtaLabel,
  publicShopPriceDisplay,
  queryPublicShopCatalog,
} from "@/server/repositories/public-shop-catalog";

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    group?: string;
    q?: string;
    page?: string;
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

function buildHref(opts: {
  category?: string;
  q?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.category && opts.category !== "all") {
    params.set("category", opts.category);
  }
  if (opts.q) params.set("q", opts.q);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `${paths.shop}?${qs}` : paths.shop;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  // Compat: old ?group= software filters map to category when possible
  const categoryRaw = params.category ?? params.group ?? "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const result = await queryPublicShopCatalog({
    q,
    category: categoryRaw,
    page,
    pageSize: 12,
  });

  const activeCategory =
    categoryRaw !== "all" &&
    result.categories.some((c) => c.slug === categoryRaw)
      ? categoryRaw
      : "all";

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.shop")}</p>
          <h1 className="text-h1 mb-4">{t("shop.title")}</h1>
          <p className="text-body-lg text-muted prose-width max-w-2xl">
            {t("shop.intro")}
          </p>
          <p className="mt-4 text-small text-muted max-w-2xl">
            {locale === "nl" ? (
              <>
                Alle producten komen uit de centrale VDB Digital-catalogus.
                Directe online betaling is uitgeschakeld — vraag een offerte of
                beschikbaarheid aan.
              </>
            ) : (
              <>
                All products come from the central VDB Digital catalog. Direct
                online payment is disabled — request a quote or availability.
              </>
            )}
          </p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-8">
          <form method="get" className="flex flex-col sm:flex-row gap-3">
            {activeCategory !== "all" ? (
              <input type="hidden" name="category" value={activeCategory} />
            ) : null}
            <label className="sr-only" htmlFor="shop-q">
              {t("shop.searchLabel")}
            </label>
            <input
              id="shop-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("shop.searchPlaceholder")}
              className="w-full min-h-11 px-4 py-3 text-base rounded-lg border border-light-border bg-light-surface text-light-foreground"
            />
            <button
              type="submit"
              className="min-h-11 min-w-11 px-5 rounded-lg bg-primary text-primary-fg text-small font-medium shrink-0"
            >
              {t("shop.searchLabel")}
            </button>
          </form>

          <div
            className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
            role="group"
            aria-label={t("shop.categories")}
          >
            <LocaleLink
              href={buildHref({ q: q || undefined })}
              prefetch={false}
              className={cn(
                "shrink-0 px-4 py-2.5 rounded-lg text-small border transition-colors min-h-11 inline-flex items-center",
                activeCategory === "all"
                  ? "bg-primary text-primary-fg border-primary"
                  : "border-light-border text-light-muted hover:border-primary hover:text-primary",
              )}
            >
              {t("shop.all")} ({result.allCount})
            </LocaleLink>
            {result.categories.map((c) => (
              <LocaleLink
                key={c.slug}
                href={buildHref({ category: c.slug, q: q || undefined })}
                prefetch={false}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-lg text-small border transition-colors min-h-11 inline-flex items-center",
                  activeCategory === c.slug
                    ? "bg-primary text-primary-fg border-primary"
                    : "border-light-border text-light-muted hover:border-primary hover:text-primary",
                )}
              >
                {c.name} ({c.count})
              </LocaleLink>
            ))}
          </div>

          <p className="text-xs text-light-muted" aria-live="polite">
            {t("shop.resultsCount", { count: String(result.total) })}
          </p>
          <p className="text-xs text-light-muted">{t("shop.vatNote")}</p>

          {result.items.length === 0 ? (
            <div className="rounded-lg border border-light-border p-8 text-center">
              <h2 className="text-h3 text-light-foreground mb-2">
                {t("shop.emptyTitle")}
              </h2>
              <p className="text-light-muted mb-6">
                {t("shop.noSearchResults")}
              </p>
              <LocaleLinkButton
                href={paths.quote}
                variant="outline"
                tone="light"
              >
                {t("shop.requestQuote")}
              </LocaleLinkButton>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
              {result.items.map((item) => {
                const price = publicShopPriceDisplay(item, locale);
                const cta = publicShopCtaLabel(item, locale);
                const imageSrc = item.primaryImagePath!;
                return (
                  <li key={item.id} className="min-w-0">
                    <Card
                      variant="light"
                      className="flex h-full min-w-0 flex-col overflow-hidden p-0"
                    >
                      <LocaleLink
                        href={`${paths.shop}/${item.slug}`}
                        prefetch={false}
                        className="relative block aspect-[16/10] bg-background"
                      >
                        <Image
                          src={imageSrc}
                          alt={item.name}
                          width={1200}
                          height={750}
                          className="h-full w-full object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          loading="lazy"
                          unoptimized={imageSrc.endsWith(".svg")}
                        />
                      </LocaleLink>
                      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
                        <p className="text-xs uppercase tracking-wide text-light-muted">
                          {item.categoryName || "—"}
                        </p>
                        <h2 className="text-h3 text-light-foreground">
                          <LocaleLink
                            href={`${paths.shop}/${item.slug}`}
                            prefetch={false}
                            className="hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {item.name}
                          </LocaleLink>
                        </h2>
                        <p className="text-small text-light-muted flex-1">
                          {item.shortDescription}
                        </p>
                        <ul className="flex flex-wrap gap-2 text-xs text-light-muted list-none p-0 m-0">
                          {item.audienceB2b ? (
                            <li className="rounded border border-light-border px-2 py-1">
                              B2B
                            </li>
                          ) : null}
                          {item.audienceB2c ? (
                            <li className="rounded border border-light-border px-2 py-1">
                              B2C
                            </li>
                          ) : null}
                          {item.billingType ? (
                            <li className="rounded border border-light-border px-2 py-1">
                              {item.billingType.replaceAll("_", " ")}
                            </li>
                          ) : null}
                        </ul>
                        <p className="text-sm font-medium text-primary">
                          {price.mode === "on_request" && !item.priceLabel
                            ? t("shop.priceOnRequest")
                            : price.label}
                        </p>
                        <div className="mt-auto pt-3">
                          <LocaleLinkButton
                            href={`${paths.quote}?product=${encodeURIComponent(item.slug)}`}
                            variant="outline"
                            tone="light"
                            size="sm"
                            className="w-full justify-center min-h-11"
                          >
                            {cta}
                          </LocaleLinkButton>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}

          {result.totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center justify-center gap-3"
              aria-label={t("shop.showMore")}
            >
              {result.page > 1 ? (
                <LocaleLink
                  href={buildHref({
                    category:
                      activeCategory === "all" ? undefined : activeCategory,
                    q: q || undefined,
                    page: result.page - 1,
                  })}
                  prefetch={false}
                  className="min-h-11 px-4 inline-flex items-center rounded-lg border border-light-border text-small"
                >
                  ←
                </LocaleLink>
              ) : null}
              <span className="text-small text-light-muted">
                {result.page} / {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <LocaleLink
                  href={buildHref({
                    category:
                      activeCategory === "all" ? undefined : activeCategory,
                    q: q || undefined,
                    page: result.page + 1,
                  })}
                  prefetch={false}
                  className="min-h-11 px-4 inline-flex items-center rounded-lg border border-light-border text-small"
                >
                  {t("shop.showMore")} →
                </LocaleLink>
              ) : null}
            </nav>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
