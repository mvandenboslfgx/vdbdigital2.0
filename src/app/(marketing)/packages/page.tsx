import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, Card } from "@/components/ui/container";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import { ServerLocaleLinkButton } from "@/components/ui/server-locale-link-button";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
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
import {
  COMMERCIAL_VISUAL,
  commercialVisualForSlug,
} from "@/config/product-visuals";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("nav.packages"),
    description: t("packagesPage.metaDescription"),
    alternates: buildLocaleAlternates(paths.packages, locale),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

/**
 * Website / services packages — no license inventory imports.
 */
export default async function PackagesPage() {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const commercial = getCommercialContent(locale);

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">{t("nav.packages")}</p>
          <h1 className="text-h1 mb-4">{t("packagesPage.title")}</h1>
          <p className="text-body-lg text-muted prose-width max-w-2xl">
            {t("packagesPage.intro")}
          </p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-12">
          <div>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("shop.websitePackages")}
            </h2>
            <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {websitePackages.map((pkg) => {
                const copy = commercial.packages[pkg.i18nKey];
                const catalog = getPackageCatalogItem(pkg);
                const price = catalog ? formatDualPrice(catalog, locale) : null;
                const visualKey = commercialVisualForSlug(pkg.slug);
                const visual = COMMERCIAL_VISUAL[visualKey];
                return (
                  <Card
                    key={pkg.id}
                    variant="light"
                    className="flex h-full min-w-0 flex-col overflow-hidden p-0"
                  >
                    <div className="relative aspect-[16/10] bg-background">
                      <Image
                        src={visual.src}
                        alt={locale === "nl" ? visual.altNl : visual.altEn}
                        width={visual.width}
                        height={visual.height}
                        className="h-full w-full object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        loading="lazy"
                        unoptimized
                      />
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-5">
                      <h3 className="text-h3 text-light-foreground mb-2">
                        {copy.name}
                      </h3>
                      <p className="text-small mb-6 flex-1 text-light-muted">
                        {copy.summary}
                      </p>
                      {price ? (
                        <div className="mb-2 space-y-1.5">
                          <p className="text-xl font-semibold tracking-tight text-primary">
                            {price.amountLabel}
                          </p>
                          {price.vatExclNote ? (
                            <p className="text-sm text-light-muted">
                              {price.vatExclNote}
                            </p>
                          ) : null}
                          {price.inclAmountLabel ? (
                            <p className="text-sm text-light-muted">
                              {price.inclAmountLabel}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-auto px-5 pb-5 pt-2">
                      <ServerLocaleLinkButton
                        href={`${paths.quote}?package=${pkg.slug}`}
                        variant="outline"
                        tone="light"
                        size="sm"
                        className="w-full justify-center min-h-11"
                      >
                        {t("nav.quote")}
                      </ServerLocaleLinkButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-h2 text-light-foreground mb-6">
              {t("shop.bundles")}
            </h2>
            <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {commercialBundles.map((bundle) => {
                const copy = commercial.bundles[bundle.i18nKey];
                const catalog = getBundleCatalogItem(bundle);
                const price = catalog ? formatDualPrice(catalog, locale) : null;
                const visualKey = commercialVisualForSlug(bundle.slug);
                const visual = COMMERCIAL_VISUAL[visualKey];
                return (
                  <Card
                    key={bundle.id}
                    variant="light"
                    className="flex h-full min-w-0 flex-col overflow-hidden p-0"
                  >
                    <div className="relative aspect-[16/10] bg-background">
                      <Image
                        src={visual.src}
                        alt={locale === "nl" ? visual.altNl : visual.altEn}
                        width={visual.width}
                        height={visual.height}
                        className="h-full w-full object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                        unoptimized
                      />
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-5">
                      <h3 className="text-h3 text-light-foreground mb-2">
                        {copy.name}
                      </h3>
                      <p className="text-small mb-6 flex-1 text-light-muted">
                        {copy.summary}
                      </p>
                      {price ? (
                        <p className="text-xl font-semibold tracking-tight text-primary">
                          {price.amountLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-auto px-5 pb-5 pt-2">
                      <ServerLocaleLinkButton
                        href={`${paths.quote}?package=${bundle.slug}`}
                        variant="outline"
                        tone="light"
                        size="sm"
                        className="w-full justify-center min-h-11"
                      >
                        {t("nav.quote")}
                      </ServerLocaleLinkButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <p className="text-small text-light-muted">
            <ServerLocaleLink
              href={paths.shop}
              prefetch={false}
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("shop.viewSoftware")}
            </ServerLocaleLink>
          </p>
        </Container>
      </Section>
    </>
  );
}
