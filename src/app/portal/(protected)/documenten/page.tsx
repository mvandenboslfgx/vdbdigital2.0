import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { PortalUploadForm } from "@/components/documents/document-forms";
import { documentUploadLabels } from "@/lib/portal/form-labels";
import { listPortalFiles } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import { DOCUMENT_CATEGORY_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Documenten",
  robots: { index: false },
};

export default async function PortalDocumentsPage() {
  const { t, locale } = await getDictionary();
  const { files, ctx } = await listPortalFiles();
  const canUpload = hasCustomerPermission(
    ctx.customerRole,
    "portal.documents.upload",
  );

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("portal.documentsPage.title")}</h1>

      {canUpload ? <PortalUploadForm labels={documentUploadLabels(t)} /> : null}

      {files.length === 0 ? (
        <EmptyState
          title={t("portal.documentsPage.emptyTitle")}
          description={t("portal.documentsPage.emptyBody")}
        />
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id}>
              <Link
                href={withLocale(`/portal/documenten/${f.id}`, locale)}
                className="block rounded-xl border border-border p-4 hover:border-primary"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium truncate">
                    {f.title || f.file_name}
                  </span>
                  <span className="text-muted text-small shrink-0">
                    {formatDate(f.created_at, locale)}
                  </span>
                </div>
                <p className="text-small text-muted mt-1">
                  {labelFor(t, DOCUMENT_CATEGORY_KEYS, f.category ?? "OTHER")}
                  {f.size_bytes != null ? ` · ${formatBytes(f.size_bytes)}` : ""}
                  {f.version_number ? ` · v${f.version_number}` : ""}
                  {f.visibility === "CUSTOMER_UPLOAD"
                    ? t("portal.documentsPage.sourceCustomerSuffix")
                    : t("portal.documentsPage.sourceVdbSuffix")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
