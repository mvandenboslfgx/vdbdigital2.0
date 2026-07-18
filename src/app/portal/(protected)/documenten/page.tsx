import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { PortalUploadForm } from "@/components/documents/document-forms";
import { listPortalFiles } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import {
  DOCUMENT_CATEGORY_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Documenten",
  robots: { index: false },
};

export default async function PortalDocumentsPage() {
  const { files, ctx } = await listPortalFiles();
  const canUpload = hasCustomerPermission(
    ctx.customerRole,
    "portal.documents.upload",
  );

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Documenten</h1>

      {canUpload ? <PortalUploadForm /> : null}

      {files.length === 0 ? (
        <EmptyState
          title="Geen documenten"
          description="Er zijn momenteel geen documenten beschikbaar."
        />
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id}>
              <Link
                href={`/portal/documenten/${f.id}`}
                className="block rounded-xl border border-border p-4 hover:border-primary"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium truncate">
                    {f.title || f.file_name}
                  </span>
                  <span className="text-muted text-small shrink-0">
                    {new Date(f.created_at).toLocaleDateString("nl-NL")}
                  </span>
                </div>
                <p className="text-small text-muted mt-1">
                  {labelNl(DOCUMENT_CATEGORY_NL, f.category ?? "OTHER")}
                  {f.size_bytes != null ? ` · ${formatBytes(f.size_bytes)}` : ""}
                  {f.version_number ? ` · v${f.version_number}` : ""}
                  {f.visibility === "CUSTOMER_UPLOAD"
                    ? " · Door jou aangeleverd"
                    : " · VDB Digital"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
