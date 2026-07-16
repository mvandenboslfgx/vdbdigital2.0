import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  carePackages,
  getCareCatalogItem,
} from "@/config/commercial/care-packages";
import { formatDualPrice } from "@/lib/utilities/commercial-price";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

export async function CarePackagesSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);

  return (
    <Section variant="dark">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{c.care.eyebrow}</p>
          <h2 className="text-h2 mb-4">{c.care.title}</h2>
          <p className="text-body text-muted">{c.care.body}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {carePackages.map((pkg) => {
            const copy = c.care[pkg.i18nKey];
            const catalog = getCareCatalogItem(pkg);
            const price = catalog ? formatDualPrice(catalog, locale) : null;

            return (
              <Card key={pkg.id} className="flex flex-col h-full min-w-0">
                <h3 className="text-h3 mb-2">{copy.name}</h3>
                <p className="text-small text-muted mb-4 flex-1">{copy.summary}</p>
                {price ? (
                  <div className="mb-4 space-y-1">
                    <p className="text-sm font-medium text-primary">{price.exclLabel}</p>
                    {price.inclLabel ? (
                      <p className="text-xs text-muted">{price.inclLabel}</p>
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
