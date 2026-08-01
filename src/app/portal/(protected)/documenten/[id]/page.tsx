import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import { DocumentDownloadButton } from "@/components/documents/document-forms";
import { getPortalDocument } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import { DOCUMENT_CATEGORY_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false },
};

export default async function PortalDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
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
          href="/portal/documenten"
          className="text-small text-primary hover:underline"
        >
          ← Documenten
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
            <dt className="text-muted">Bestand</dt>
            <dd>{document.safe_filename || document.file_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Grootte</dt>
            <dd>{formatBytes(document.size_bytes)}</dd>
          </div>
          <div>
            <dt className="text-muted">Bron</dt>
            <dd>
              {document.visibility === "CUSTOMER_UPLOAD"
                ? "Door jou aangeleverd"
                : "VDB Digital"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Datum</dt>
            <dd>
              {new Date(document.created_at).toLocaleString("nl-NL")}
            </dd>
          </div>
        </dl>
        {canDownload ? (
          <div className="mt-4">
            <DocumentDownloadButton documentId={document.id} audience="customer" />
          </div>
        ) : null}
      </Card>

      <section>
        <h2 className="text-h3 mb-3">Versiehistorie</h2>
        {versions.length <= 1 ? (
          <p className="text-muted text-small">Geen eerdere zichtbare versies.</p>
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
                    href={`/portal/documenten/${v.id}`}
                    className="text-primary hover:underline"
                  >
                    v{v.version_number}
                    {v.is_current ? " · huidig" : ""}
                  </Link>
                  <span className="text-muted">
                    {formatBytes(v.size_bytes)} ·{" "}
                    {new Date(v.created_at).toLocaleDateString("nl-NL")}
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
