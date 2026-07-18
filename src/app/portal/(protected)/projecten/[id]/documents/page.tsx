import { notFound } from "next/navigation";
import Link from "next/link";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { PortalUploadForm } from "@/components/documents/document-forms";
import { getPortalProject, listPortalFiles } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import { DOCUMENT_CATEGORY_NL, labelNl } from "@/lib/portal/labels";

export default async function PortalProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, ctx } = await getPortalProject(id);
  if (!project) notFound();

  const { files } = await listPortalFiles({ projectId: id });
  const canUpload = hasCustomerPermission(
    ctx.customerRole,
    "portal.documents.upload",
  );

  return (
    <PortalProjectTabShell projectId={id} active="documents">
      {canUpload ? <PortalUploadForm projectId={id} /> : null}
      {files.length === 0 ? (
        <p className="text-muted text-small">
          Er zijn momenteel geen documenten beschikbaar.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id}>
              <Link
                href={`/portal/documenten/${f.id}`}
                className="block rounded-xl border border-border p-4 hover:border-primary"
              >
                <p className="font-medium">{f.title || f.file_name}</p>
                <p className="text-small text-muted mt-1">
                  {labelNl(DOCUMENT_CATEGORY_NL, f.category ?? "OTHER")}
                  {f.size_bytes != null ? ` · ${formatBytes(f.size_bytes)}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PortalProjectTabShell>
  );
}
