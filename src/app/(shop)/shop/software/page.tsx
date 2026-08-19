import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/container";
import { PillarNav } from "@/components/shop/pillar-nav";
import { SoftwareProcurementPanel } from "@/components/shop/software-procurement-panel";
import { SoftwareCatalogGrid } from "@/components/shop/software-catalog-grid";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { buildLocaleAlternates, openGraphLocale } from "@/i18n/seo";
import { paths } from "@/i18n/config";
import {
  getSoftwareCatalogPublicStats,
  queryPublicSoftwareCatalog,
} from "@/server/repositories/software-public-catalog";
import type { SoftwareCatalogGroup } from "@/config/software-catalog";

interface SoftwareShopPageProps {
  searchParams: Promise<{
    q?: string;
    group?: string;
    page?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  return {
    title: t("softwareShop.metaTitle"),
    description: t("softwareShop.metaDescription"),
    alternates: buildLocaleAlternates(paths.shopSoftware, locale),
    openGraph: { locale: openGraphLocale(locale) },
    robots: { index: true, follow: true },
  };
}

const VALID_GROUPS = new Set<SoftwareCatalogGroup>([
  "windows",
  "security",
  "tools",
  "professional",
]);

export default async function SoftwareShopPage({
  searchParams,
}: SoftwareShopPageProps) {
  const locale = await getLocale();
  const { t } = await getDictionary(locale);
  const params = await searchParams;
  const q = params.q?.trim();
  const groupRaw = params.group ?? "all";
  const group =
    groupRaw !== "all" && VALID_GROUPS.has(groupRaw as SoftwareCatalogGroup)
      ? (groupRaw as SoftwareCatalogGroup)
      : "all";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);

  const catalog = queryPublicSoftwareCatalog(locale, {
    q,
    group,
    page,
    pageSize: 12,
  });
  const stats = getSoftwareCatalogPublicStats();

  const pillarLabels = {
    build: t("pillarNav.build"),
    automate: t("pillarNav.automate"),
    grow: t("pillarNav.grow"),
    software: t("pillarNav.software"),
  };

  return (
    <>
      <Section variant="dark" className="pt-12 pb-10">
        <Container>
          <p className="text-label text-primary mb-3">{t("softwareShop.eyebrow")}</p>
          <h1 className="text-h1 mb-4">{t("softwareShop.title")}</h1>
          <p className="text-body-lg text-muted prose-width max-w-3xl">
            {t("softwareShop.intro")}
          </p>
          <p className="text-small text-muted mt-4 max-w-2xl">
            {t("softwareShop.secondaryNote")}
          </p>
        </Container>
      </Section>

      <Section variant="light">
        <Container className="space-y-10">
          <PillarNav activePillar="SOFTWARE" labels={pillarLabels} />

          <form method="get" className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <label className="sr-only" htmlFor="software-q">
              {t("softwareShop.searchLabel")}
            </label>
            <input
              id="software-q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder={t("softwareShop.searchPlaceholder")}
              className="w-full min-h-11 px-4 py-3 text-base rounded-lg border border-light-border bg-light-surface text-light-foreground"
            />
            <button
              type="submit"
              className="min-h-11 px-5 rounded-lg bg-primary text-white text-small font-medium shrink-0"
            >
              {t("softwareShop.searchLabel")}
            </button>
          </form>

          {catalog.items.length === 0 ? (
            <SoftwareProcurementPanel
              title={t("softwareShop.procurementTitle")}
              body={t("softwareShop.procurementBody")}
              curatedNote={t("softwareShop.procurementCuratedNote", {
                count: String(stats.curatedCandidateCount),
              })}
              requestCta={t("softwareShop.requestLicense")}
              introCta={t("nav.scheduleIntro")}
              statsLine={t("softwareShop.procurementStats", {
                public: String(stats.publicVerifiedCount),
                curated: String(stats.curatedCandidateCount),
              })}
            />
          ) : (
            <SoftwareCatalogGrid
              items={catalog.items}
              requestLabel={t("softwareShop.otherSoftware")}
              onRequestLabel={t("softwareShop.priceOnRequest")}
            />
          )}

          {catalog.totalPages > 1 ? (
            <p className="text-small text-light-muted text-center">
              {t("softwareShop.pageOf", {
                page: String(catalog.page),
                total: String(catalog.totalPages),
              })}
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
