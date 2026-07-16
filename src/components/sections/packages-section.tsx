import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  websitePackages,
  getPackageCatalogItem,
} from "@/config/commercial/website-packages";
import { formatDualPrice } from "@/lib/utilities/commercial-price";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

export async function PackagesSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);

  return (
    <Section variant="light">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{c.packages.eyebrow}</p>
          <h2 className="text-h2 text-light-foreground mb-4">{c.packages.title}</h2>
          <p className="text-body text-light-muted">{c.packages.body}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {websitePackages.map((pkg) => {
            const copy = c.packages[pkg.i18nKey];
            const catalog = getPackageCatalogItem(pkg);
            const price = catalog ? formatDualPrice(catalog, locale) : null;

            return (
              <Card key={pkg.id} variant="light" className="flex flex-col h-full min-w-0">
                <h3 className="text-h3 text-light-foreground mb-2">{copy.name}</h3>
                <p className="text-small text-light-muted mb-4 flex-1">{copy.summary}</p>
                {price ? (
                  <div className="mb-4 space-y-1">
                    <p className="text-sm font-medium text-primary">{price.exclLabel}</p>
                    {price.inclLabel ? (
                      <p className="text-xs text-light-muted">{price.inclLabel}</p>
                    ) : null}
                    {!price.isQuoteOnly ? (
                      <p className="text-xs text-light-muted">
                        {locale === "nl"
                          ? "Startprijs · definitieve scope na kennismaking"
                          : "Starting price · final scope after introduction"}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-primary mb-4">{copy.price}</p>
                )}
                <LocaleLinkButton
                  href={
                    pkg.quoteOnly
                      ? `${paths.quote}?package=${pkg.slug}`
                      : `${paths.contact}?intent=introduction&package=${pkg.slug}`
                  }
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                >
                  {pkg.quoteOnly
                    ? locale === "nl"
                      ? "Vraag een voorstel aan"
                      : "Request a proposal"
                    : locale === "nl"
                      ? "Plan een kennismaking"
                      : "Schedule an introduction"}
                </LocaleLinkButton>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
