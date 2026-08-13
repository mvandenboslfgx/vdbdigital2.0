import { Container, Section, Card } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import {
  websitePackages,
  getPackageCatalogItem,
} from "@/config/commercial/website-packages";
import { formatDualPrice } from "@/lib/utilities/commercial-price";
import { paths } from "@/i18n/config";
import { ServerLocaleLinkButton } from "@/components/ui/server-locale-link-button";

function PriceBlock({
  price,
  fallback,
}: {
  price: ReturnType<typeof formatDualPrice> | null;
  fallback?: string;
}) {
  if (!price) {
    return fallback ? (
      <p className="text-lg font-semibold text-primary">{fallback}</p>
    ) : null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xl font-semibold tracking-tight text-primary">
        {price.amountLabel}
      </p>
      {price.vatExclNote ? (
        <p className="text-sm text-light-muted">{price.vatExclNote}</p>
      ) : null}
      {price.inclAmountLabel ? (
        <p className="text-sm text-light-muted">{price.inclAmountLabel}</p>
      ) : null}
      {price.scopeNote ? (
        <p className="text-xs leading-relaxed text-light-muted">{price.scopeNote}</p>
      ) : null}
    </div>
  );
}

export async function PackagesSection() {
  const locale = await getLocale();
  const c = getCommercialContent(locale);

  return (
    <Section variant="light" id="packages" data-pricing-section="packages">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-label text-primary mb-3">{c.packages.eyebrow}</p>
          <h2 className="text-h2 text-light-foreground mb-4">{c.packages.title}</h2>
          <p className="text-body text-light-muted">{c.packages.body}</p>
        </div>
        <div
          className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4"
          data-pricing-grid
        >
          {websitePackages.map((pkg) => {
            const copy = c.packages[pkg.i18nKey];
            const catalog = getPackageCatalogItem(pkg);
            const price = catalog ? formatDualPrice(catalog, locale) : null;

            return (
              <Card
                key={pkg.id}
                variant="light"
                data-pricing-card={pkg.slug}
                className="flex h-full min-w-0 flex-col"
              >
                <div className="flex min-h-0 flex-1 flex-col">
                  <h3 className="text-h3 text-light-foreground mb-2">{copy.name}</h3>
                  <p className="text-small mb-6 flex-1 text-light-muted">
                    {copy.summary}
                  </p>
                  <div data-pricing-amount className="mb-2">
                    <PriceBlock price={price} fallback={copy.price} />
                  </div>
                </div>
                <div className="mt-auto pt-6" data-pricing-cta>
                  <ServerLocaleLinkButton
                    href={
                      pkg.quoteOnly
                        ? `${paths.quote}?package=${pkg.slug}`
                        : `${paths.contact}?intent=introduction&package=${pkg.slug}`
                    }
                    variant="outline"
                    tone="light"
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
                  </ServerLocaleLinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
