import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/container";
import {
  AdminDocumentUploadForm,
  DocumentDownloadButton,
  VisibilityForm,
} from "@/components/documents/document-forms";
import { archiveDocumentAction } from "@/server/actions/document-actions";
import { getAdminDocument } from "@/server/repositories/admin-documents";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { formatBytes } from "@/lib/validation/documents";
import {
  DOCUMENT_CATEGORY_KEYS,
  DOCUMENT_STATUS_KEYS,
  DOCUMENT_VISIBILITY_KEYS,
  SCAN_STATUS_KEYS,
  labelFor,
  resolveLabelMap,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false },
};

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminDocument(id);
  if (!bundle) notFound();

  const { document: doc, versions, downloads, ctx } = bundle;
  const org = Array.isArray(doc.organization)
    ? doc.organization[0]
    : doc.organization;
  const project = Array.isArray(doc.project) ? doc.project[0] : doc.project;
  const { organizations } = await listAdminOrganizations({ pageSize: 100 });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/documents"
          className="text-small text-primary hover:underline"
        >
          ← Documenten
        </Link>
        <h1 className="text-h1 mt-2">{doc.title}</h1>
        <p className="text-muted text-small mt-1 font-mono">
          {doc.document_number}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <dl className="text-small space-y-2">
            <div>
              <dt className="text-muted">Organisatie</dt>
              <dd>{org?.trade_name || org?.legal_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Project</dt>
              <dd>
                {project ? (
                  <Link
                    href={`/admin/projects/${project.id}/documents`}
                    className="text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Categorie</dt>
              <dd>{labelFor(t, DOCUMENT_CATEGORY_KEYS, doc.category)}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>{labelFor(t, DOCUMENT_STATUS_KEYS, doc.status)}</dd>
            </div>
            <div>
              <dt className="text-muted">Zichtbaarheid</dt>
              <dd>{labelFor(t, DOCUMENT_VISIBILITY_KEYS, doc.visibility)}</dd>
            </div>
            <div>
              <dt className="text-muted">Virusscan</dt>
              <dd>
                {labelFor(t, SCAN_STATUS_KEYS, doc.scan_status)}
                {doc.scan_status === "NOT_REQUIRED" ? (
                  <span className="text-muted">
                    {" "}
                    — Virusscan nog niet uitgevoerd
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <dl className="text-small space-y-2">
            <div>
              <dt className="text-muted">Bestandsnaam</dt>
              <dd>{doc.safe_filename || doc.file_name}</dd>
            </div>
            <div>
              <dt className="text-muted">MIME</dt>
              <dd>{doc.mime_type}</dd>
            </div>
            <div>
              <dt className="text-muted">Grootte</dt>
              <dd>{formatBytes(doc.size_bytes)}</dd>
            </div>
            <div>
              <dt className="text-muted">Checksum (SHA-256)</dt>
              <dd className="break-all font-mono text-xs">
                {doc.checksum_sha256 || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Versie</dt>
              <dd>
                v{doc.version_number}
                {doc.is_current ? " (huidig)" : ""}
              </dd>
            </div>
            <div className="pt-2">
              <DocumentDownloadButton documentId={doc.id} audience="staff" />
            </div>
          </dl>
        </Card>
      </div>

      {hasPermission(ctx.role, "documents.manage_visibility") ? (
        <Card>
          <h2 className="text-h3 mb-3">Zichtbaarheid</h2>
          <VisibilityForm
            documentId={doc.id}
            version={doc.version}
            visibility={doc.visibility}
            visibilityLabels={resolveLabelMap(t, DOCUMENT_VISIBILITY_KEYS)}
          />
        </Card>
      ) : null}

      <section>
        <h2 className="text-h3 mb-3">Versies</h2>
        <ul className="space-y-2 mb-4">
          {versions.map(
            (v: {
              id: string;
              version_number: number;
              created_at: string;
              is_current: boolean;
              change_summary: string | null;
            }) => (
              <li
                key={v.id}
                className="rounded-lg border border-border px-3 py-2 text-small flex flex-wrap justify-between gap-2"
              >
                <Link
                  href={`/admin/documents/${v.id}`}
                  className="text-primary hover:underline"
                >
                  v{v.version_number}
                  {v.is_current ? " · huidig" : ""}
                </Link>
                <span className="text-muted">
                  {new Date(v.created_at).toLocaleString("nl-NL")}
                  {v.change_summary ? ` · ${v.change_summary}` : ""}
                </span>
              </li>
            ),
          )}
        </ul>
        {hasPermission(ctx.role, "documents.manage_versions") ? (
          <div>
            <h3 className="font-medium mb-2">Nieuwe versie uploaden</h3>
            <AdminDocumentUploadForm
              organizations={organizations.map((o) => ({
                id: o.id,
                label: o.trade_name || o.legal_name,
              }))}
              defaultOrganizationId={doc.organization_id}
              defaultProjectId={doc.project_id ?? undefined}
              parentDocumentId={doc.parent_document_id ?? doc.id}
              categoryLabels={resolveLabelMap(t, DOCUMENT_CATEGORY_KEYS)}
              visibilityLabels={resolveLabelMap(t, DOCUMENT_VISIBILITY_KEYS)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-h3 mb-3">Recente downloads</h2>
        {downloads.length === 0 ? (
          <p className="text-muted text-small">Nog geen downloads geregistreerd.</p>
        ) : (
          <ul className="text-small space-y-1">
            {downloads.map(
              (d: {
                id: string;
                actor_audience: string;
                created_at: string;
              }) => (
                <li key={d.id}>
                  {d.actor_audience} ·{" "}
                  {new Date(d.created_at).toLocaleString("nl-NL")}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {hasPermission(ctx.role, "documents.archive") &&
      doc.status !== "ARCHIVED" ? (
        <form action={archiveDocumentAction}>
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="expectedVersion" value={doc.version} />
          <Button type="submit" variant="outline">
            Archiveer document
          </Button>
        </form>
      ) : null}
    </div>
  );
}
