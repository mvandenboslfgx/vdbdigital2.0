import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteEditorForm } from "@/components/admin/quote-editor-form";
import { getAdminQuote } from "@/server/repositories/admin-quotes";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildQuoteEditorLabels } from "@/lib/admin/line-item-editor-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.quotes.editTitle"), robots: { index: false } };
}

export default async function AdminQuoteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminQuote(id);
  if (!bundle) notFound();
  if (!["DRAFT", "IN_REVIEW", "READY"].includes(bundle.quote.status)) {
    redirect(`/admin/quotes/${id}`);
  }

  const { organizations } = await listAdminOrganizations({ pageSize: 100 });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/admin/quotes/${id}`}
          className="text-small text-primary hover:underline"
        >
          {t("admin.page.quotes.backToQuote")}
        </Link>
        <h1 className="text-h1 mt-2">{t("admin.page.quotes.editTitle")}</h1>
      </div>
      <QuoteEditorForm
        mode="edit"
        organizations={organizations.map((o) => ({
          id: o.id,
          label: o.trade_name || o.legal_name,
        }))}
        quote={{
          id: bundle.quote.id,
          version: bundle.quote.version,
          organization_id: bundle.quote.organization_id,
          project_id: bundle.quote.project_id,
          title: bundle.quote.title,
          description: bundle.quote.description,
          valid_until: bundle.quote.valid_until,
          terms_version: bundle.quote.terms_version,
          discount_cents: bundle.quote.discount_cents ?? 0,
        }}
        initialItems={bundle.items.map(
          (i: {
            title: string;
            description: string | null;
            item_type: string;
            quantity: number;
            unit_label: string;
            unit_price_cents: number;
            discount_cents: number;
            tax_rate_basis_points: number;
            is_optional: boolean;
            sort_order: number;
          }) => ({
            title: i.title,
            description: i.description ?? "",
            itemType: i.item_type as
              | "SERVICE"
              | "PRODUCT"
              | "ADDON"
              | "DISCOUNT"
              | "CUSTOM",
            quantity: Number(i.quantity),
            unitLabel: i.unit_label,
            unitPriceCents: i.unit_price_cents,
            discountCents: i.discount_cents,
            taxRateBasisPoints: i.tax_rate_basis_points,
            isOptional: i.is_optional,
            sortOrder: i.sort_order,
          }),
        )}
        labels={buildQuoteEditorLabels(t)}
      />
    </div>
  );
}
