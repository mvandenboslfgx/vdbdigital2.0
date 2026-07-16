import type { Metadata } from "next";
import { Card, Badge } from "@/components/ui/container";
import { getAdminProducts } from "@/server/repositories/admin-products";
import { formatPriceLabel } from "@/lib/utilities/money";
import {
  assertProductTranslationComplete,
  getProductPublicationAdvice,
} from "@/i18n/localize-product";

export const metadata: Metadata = {
  title: "Manage products",
  robots: { index: false },
};

/**
 * Admin is English-first. Full EN/NL tab editors are not enabled yet.
 * Publication advice blocks incomplete translations conceptually —
 * nothing is auto-published from this screen.
 */
export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <h1 className="text-h1 mb-2">Products</h1>
      <p className="text-muted text-small mb-8 max-w-2xl">
        English is required. Dutch must be complete before NL publication.
        Translation advice is informational — no automatic publish.
      </p>
      <div className="space-y-3">
        {products.map((p) => {
          const advice = getProductPublicationAdvice(p);
          const en = assertProductTranslationComplete(p, "en");
          const nl = assertProductTranslationComplete(p, "nl");
          return (
            <Card key={p.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-small text-muted">
                  {p.categoryName} · {p.status}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={en.complete ? "" : "opacity-70"}>
                    EN {en.complete ? "complete" : "incomplete"}
                  </Badge>
                  <Badge className={nl.complete ? "" : "opacity-70"}>
                    NL {nl.complete ? "complete" : "incomplete"}
                  </Badge>
                  <Badge>{advice}</Badge>
                </div>
              </div>
              <p className="text-primary font-medium">
                {formatPriceLabel(p.priceCents, p.fromPriceCents, p.billingType, "en")}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
