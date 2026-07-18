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

export const metadata: Metadata = {
  title: "Productpreview",
  robots: { index: false, follow: false },
};

export default async function AdminProductPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");
  if (!hasPermission(access.context.role, "products.read")) redirect("/admin");

  const product = await getAdminProductById(id);
  if (!product) notFound();

  const reasons = getCheckoutBlockLabelsNl(product, "B2B");
  const sellable = isDirectlySellableServerSide(product);
  const mode = resolveStoredOrDerivedPriceMode(product);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-small text-muted mb-1">
            <Link href={`/admin/products/${product.id}`} className="hover:text-foreground">
              Terug naar bewerken
            </Link>
          </p>
          <h1 className="text-h1">Preview — {product.name}</h1>
          <p className="text-small text-muted mt-1">
            Veilige preview: geen order, geen Mollie, geen publieke indexatie.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={product.status} />
          <PriceModeBadge mode={mode} />
          <EligibilityBadge sellable={sellable} />
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small">
        Directe checkout is momenteel algemeen uitgeschakeld.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-semibold">Desktopweergave</h2>
          <p className="text-small text-muted">{product.categoryName}</p>
          <h3 className="text-2xl font-display">{product.name}</h3>
          <p>{product.shortDescription}</p>
          <p className="text-primary font-medium text-lg">
            {formatPriceLabel(product.priceCents, product.fromPriceCents, product.billingType, "nl")}
          </p>
          <button
            type="button"
            disabled
            className="min-h-11 px-5 rounded-lg bg-primary text-white opacity-60 cursor-not-allowed"
          >
            {product.ctaLabel || product.quoteCtaLabel || "Offerte aanvragen"}
          </button>
          <div className="prose prose-sm max-w-none text-small whitespace-pre-wrap">
            {product.fullDescription}
          </div>
          {(product.benefits?.length ?? 0) > 0 && (
            <ul className="list-disc pl-5 text-small space-y-1">
              {product.benefits?.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4 max-w-sm mx-auto w-full">
          <h2 className="font-semibold">Mobiele weergave</h2>
          <div className="rounded-[1.5rem] border-2 border-border p-4 space-y-3 bg-surface">
            <p className="text-xs text-muted">{product.categoryName}</p>
            <h3 className="text-xl font-display">{product.name}</h3>
            <p className="text-small">{product.shortDescription}</p>
            <p className="font-medium text-primary">
              {formatPriceLabel(product.priceCents, product.fromPriceCents, product.billingType, "nl")}
            </p>
            <button
              type="button"
              disabled
              className="w-full min-h-11 rounded-lg bg-primary text-white opacity-60 cursor-not-allowed text-sm"
            >
              {product.quoteCtaLabel || "Offerte"}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="font-semibold mb-2">Waarom checkout wel/niet beschikbaar zou zijn</h2>
        <ul className="text-small space-y-1 text-muted">
          {reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
