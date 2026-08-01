import type { Metadata } from "next";
import { InvoiceEditorForm } from "@/components/admin/invoice-editor-form";
import { listOrganizationsForInvoiceForm } from "@/server/repositories/admin-invoices";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.invoices.newInvoice"), robots: { index: false } };
}

export default async function AdminNewInvoicePage() {
  const { t } = await getDictionary();
  const ctx = await requireAdmin();
  await requirePermission(ctx, "invoices.create");
  const organizations = await listOrganizationsForInvoiceForm();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-h1">{t("admin.page.invoices.newInvoice")}</h1>
        <p className="text-muted text-small mt-1">
          {t("admin.page.invoices.newSubtitle")}
        </p>
      </div>
      <InvoiceEditorForm mode="create" organizations={organizations} />
    </div>
  );
}
