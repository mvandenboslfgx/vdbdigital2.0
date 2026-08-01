import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { AdminDocumentUploadForm } from "@/components/documents/document-forms";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import { listAdminDocuments } from "@/server/repositories/admin-documents";
import {
  DOCUMENT_CATEGORY_KEYS,
  DOCUMENT_STATUS_KEYS,
  DOCUMENT_VISIBILITY_KEYS,
  labelFor,
  resolveLabelMap,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatBytes } from "@/lib/validation/documents";

export default async function AdminProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  const { documents } = await listAdminDocuments({
    projectId: id,
    pageSize: 50,
  });

  return (
    <ProjectTabShell projectId={id} active="documents">
      <AdminDocumentUploadForm
        organizations={[
          {
            id: bundle.project.organization_id,
            label:
              bundle.project.organization?.trade_name ||
              bundle.project.organization?.legal_name ||
              "Organisatie",
          },
        ]}
        defaultOrganizationId={bundle.project.organization_id}
        defaultProjectId={id}
        categoryLabels={resolveLabelMap(t, DOCUMENT_CATEGORY_KEYS)}
        visibilityLabels={resolveLabelMap(t, DOCUMENT_VISIBILITY_KEYS)}
      />

      {documents.length === 0 ? (
        <p className="text-muted text-small">
          Nog geen documenten gekoppeld aan dit project.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-border p-4 flex flex-wrap justify-between gap-3"
            >
              <div>
                <Link
                  href={`/admin/documents/${d.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {d.title}
                </Link>
                <p className="text-small text-muted mt-1">
                  {labelFor(t, DOCUMENT_STATUS_KEYS, d.status)} ·{" "}
                  {labelFor(t, DOCUMENT_VISIBILITY_KEYS, d.visibility)} ·{" "}
                  {formatBytes(d.size_bytes)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProjectTabShell>
  );
}
