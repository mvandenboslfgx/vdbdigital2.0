import type { Metadata } from "next";
import { InvoiceEditorForm } from "@/components/admin/invoice-editor-form";
import { listOrganizationsForInvoiceForm } from "@/server/repositories/admin-invoices";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export const metadata: Metadata = {
  title: "Nieuwe factuur",
  robots: { index: false },
};

export default async function AdminNewInvoicePage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.create");
  const organizations = await listOrganizationsForInvoiceForm();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-h1">Nieuwe factuur</h1>
        <p className="text-muted text-small mt-1">
          Concept opslaan. Uitgeven en betalen zijn aparte stappen — geen Mollie.
        </p>
      </div>
      <InvoiceEditorForm mode="create" organizations={organizations} />
    </div>
  );
}
