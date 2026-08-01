import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminInvoice } from "@/server/repositories/admin-invoices";
import { INVOICE_STATUS_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.invoices.versionsTitle"),
    robots: { index: false },
  };
}

export default async function AdminInvoiceVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminInvoice(id);
  if (!bundle) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/admin/invoices/${id}`}
          className="text-small text-primary underline-offset-2 hover:underline"
        >
          {t("admin.page.invoices.backToInvoice")}
        </Link>
        <h1 className="text-h1 mt-2">
          {t("admin.page.invoices.versionsHeading")} ·{" "}
          {bundle.invoice.invoice_number}
        </h1>
      </div>
      {bundle.versions.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.page.invoices.noVersions")}
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.versions.map((v) => (
            <li key={v.id} className="rounded-lg border border-border p-4 text-small">
              {t("admin.common.versionNumber", { number: v.version_number })} ·{" "}
              {labelFor(t, INVOICE_STATUS_KEYS, v.status)} ·{" "}
              {formatDateTime(v.created_at, locale)}
              <div className="text-muted mt-1 font-mono text-xs break-all">
                {v.snapshot_checksum}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
