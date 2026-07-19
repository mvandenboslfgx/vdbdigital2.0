import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InvoiceEditorForm } from "@/components/admin/invoice-editor-form";
import {
  getAdminInvoice,
  listOrganizationsForInvoiceForm,
} from "@/server/repositories/admin-invoices";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export const metadata: Metadata = {
  title: "Factuur bewerken",
  robots: { index: false },
};

export default async function AdminInvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.edit");
  const bundle = await getAdminInvoice(id);
  if (!bundle) notFound();
  if (!["DRAFT", "IN_REVIEW", "READY"].includes(bundle.invoice.status)) {
    redirect(`/admin/invoices/${id}`);
  }

  const organizations = await listOrganizationsForInvoiceForm();
  const initialItems = bundle.items.map((i) => ({
    title: i.title as string,
    description: (i.description as string) || "",
    itemType: (i.item_type as
      | "SERVICE"
      | "PRODUCT"
      | "ADDON"
      | "DISCOUNT"
      | "CUSTOM"
      | "CREDIT") || "CUSTOM",
    quantity: Number(i.quantity),
    unitLabel: (i.unit_label as string) || "stuk",
    unitPriceCents: Number(i.unit_price_cents),
    discountCents: Number(i.discount_cents ?? 0),
    taxRateBasisPoints: Number(i.tax_rate_basis_points ?? 2100),
    sortOrder: Number(i.sort_order ?? 0),
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-h1">Factuur bewerken</h1>
      <InvoiceEditorForm
        mode="edit"
        organizations={organizations}
        invoice={{
          id: bundle.invoice.id,
          version: bundle.invoice.version,
          organization_id: bundle.invoice.organization_id,
          project_id: bundle.invoice.project_id,
          quote_id: bundle.invoice.quote_id,
          invoice_type: bundle.invoice.invoice_type,
          title: bundle.invoice.title,
          description: bundle.invoice.description,
          issue_date: bundle.invoice.issue_date,
          due_date: bundle.invoice.due_date,
          discount_cents: bundle.invoice.discount_cents ?? 0,
          payment_instruction: bundle.invoice.payment_instruction,
          external_accounting_reference:
            bundle.invoice.external_accounting_reference,
        }}
        initialItems={initialItems}
      />
    </div>
  );
}
