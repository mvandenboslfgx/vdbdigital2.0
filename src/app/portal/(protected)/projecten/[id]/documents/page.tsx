import { notFound } from "next/navigation";
import Link from "next/link";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { PortalUploadForm } from "@/components/documents/document-forms";
import { documentUploadLabels } from "@/lib/portal/form-labels";
import { getPortalProject, listPortalFiles } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { formatBytes } from "@/lib/validation/documents";
import { DOCUMENT_CATEGORY_KEYS, labelFor } from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export default async function PortalProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
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
      {canUpload ? (
        <PortalUploadForm projectId={id} labels={documentUploadLabels(t)} />
      ) : null}
      {files.length === 0 ? (
        <p className="text-muted text-small">
          {t("portal.projectDetail.noDocuments")}
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id}>
              <Link
                href={withLocale(`/portal/documenten/${f.id}`, locale)}
                className="block rounded-xl border border-border p-4 hover:border-primary"
              >
                <p className="font-medium">{f.title || f.file_name}</p>
                <p className="text-small text-muted mt-1">
                  {labelFor(t, DOCUMENT_CATEGORY_KEYS, f.category ?? "OTHER")}
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
