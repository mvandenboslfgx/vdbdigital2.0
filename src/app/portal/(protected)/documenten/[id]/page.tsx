import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { DocumentDownloadButton } from "@/components/documents/document-forms";
import { documentDownloadLabels } from "@/lib/portal/form-labels";
import { getPortalDocument } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import { DOCUMENT_CATEGORY_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate, formatDateTime } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false },
};

export default async function PortalDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { document, versions, ctx } = await getPortalDocument(id);
  if (!document) notFound();

  const canDownload = hasCustomerPermission(
    ctx.customerRole,
    "portal.documents.download",
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={withLocale("/portal/documenten", locale)}
          className="text-small text-primary hover:underline"
        >
          {t("portal.documentsPage.backToDocuments")}
        </Link>
        <h1 className="text-h1 mt-2">{document.title}</h1>
        <p className="text-muted text-small mt-1">
          {labelFor(t, DOCUMENT_CATEGORY_KEYS, document.category)} · v
          {document.version_number}
        </p>
      </div>

      <Card>
        <dl className="text-small space-y-2">
          <div>
            <dt className="text-muted">
              {t("portal.documentsPage.fileLabel")}
            </dt>
            <dd>{document.safe_filename || document.file_name}</dd>
          </div>
          <div>
            <dt className="text-muted">
              {t("portal.documentsPage.sizeLabel")}
            </dt>
            <dd>{formatBytes(document.size_bytes)}</dd>
          </div>
          <div>
            <dt className="text-muted">
              {t("portal.documentsPage.sourceLabel")}
            </dt>
            <dd>
              {document.visibility === "CUSTOMER_UPLOAD"
                ? t("portal.documentsPage.sourceCustomer")
                : t("portal.documentsPage.sourceVdb")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">
              {t("portal.documentsPage.dateLabel")}
            </dt>
            <dd>{formatDateTime(document.created_at, locale)}</dd>
          </div>
        </dl>
        {canDownload ? (
          <div className="mt-4">
            <DocumentDownloadButton
              documentId={document.id}
              audience="customer"
              labels={documentDownloadLabels(t)}
            />
          </div>
        ) : null}
      </Card>

      <section>
        <h2 className="text-h3 mb-3">
          {t("portal.documentsPage.versionHistoryTitle")}
        </h2>
        {versions.length <= 1 ? (
          <p className="text-muted text-small">
            {t("portal.documentsPage.noPreviousVersions")}
          </p>
        ) : (
          <ul className="space-y-2">
            {versions.map(
              (v: {
                id: string;
                version_number: number;
                created_at: string;
                is_current: boolean;
                size_bytes: number;
              }) => (
                <li
                  key={v.id}
                  className="rounded-lg border border-border px-3 py-2 text-small flex flex-wrap justify-between gap-2"
                >
                  <Link
                    href={withLocale(`/portal/documenten/${v.id}`, locale)}
                    className="text-primary hover:underline"
                  >
                    v{v.version_number}
                    {v.is_current
                      ? t("portal.documentsPage.currentSuffix")
                      : ""}
                  </Link>
                  <span className="text-muted">
                    {formatBytes(v.size_bytes)} ·{" "}
                    {formatDate(v.created_at, locale)}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
