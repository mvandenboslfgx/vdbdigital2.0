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
import { documentDownloadLabels } from "@/lib/portal/form-labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("admin.page.documents.detailTitle"),
    robots: { index: false },
  };
}

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
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
          {t("admin.page.documents.backToList")}
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
              <dt className="text-muted">
                {t("admin.page.documents.organization")}
              </dt>
              <dd>
                {org?.trade_name || org?.legal_name || t("admin.common.empty")}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("admin.page.documents.project")}</dt>
              <dd>
                {project ? (
                  <Link
                    href={`/admin/projects/${project.id}/documents`}
                    className="text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                ) : (
                  t("admin.common.empty")
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.category")}
              </dt>
              <dd>{labelFor(t, DOCUMENT_CATEGORY_KEYS, doc.category)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("admin.common.colStatus")}</dt>
              <dd>{labelFor(t, DOCUMENT_STATUS_KEYS, doc.status)}</dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.visibility")}
              </dt>
              <dd>{labelFor(t, DOCUMENT_VISIBILITY_KEYS, doc.visibility)}</dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.virusScan")}
              </dt>
              <dd>
                {labelFor(t, SCAN_STATUS_KEYS, doc.scan_status)}
                {doc.scan_status === "NOT_REQUIRED" ? (
                  <span className="text-muted">
                    {" "}
                    — {t("admin.page.documents.scanNotRun")}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <dl className="text-small space-y-2">
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.fileName")}
              </dt>
              <dd>{doc.safe_filename || doc.file_name}</dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.mimeType")}
              </dt>
              <dd>{doc.mime_type}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("admin.page.documents.size")}</dt>
              <dd>{formatBytes(doc.size_bytes)}</dd>
            </div>
            <div>
              <dt className="text-muted">
                {t("admin.page.documents.checksum")}
              </dt>
              <dd className="break-all font-mono text-xs">
                {doc.checksum_sha256 || t("admin.common.empty")}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("admin.page.documents.version")}</dt>
              <dd>
                v{doc.version_number}
                {doc.is_current
                  ? ` ${t("admin.page.documents.currentSuffix")}`
                  : ""}
              </dd>
            </div>
            <div className="pt-2">
              <DocumentDownloadButton
                documentId={doc.id}
                audience="staff"
                labels={documentDownloadLabels(t)}
              />
            </div>
          </dl>
        </Card>
      </div>

      {hasPermission(ctx.role, "documents.manage_visibility") ? (
        <Card>
          <h2 className="text-h3 mb-3">
            {t("admin.page.documents.visibility")}
          </h2>
          <VisibilityForm
            documentId={doc.id}
            version={doc.version}
            visibility={doc.visibility}
            visibilityLabels={resolveLabelMap(t, DOCUMENT_VISIBILITY_KEYS)}
          />
        </Card>
      ) : null}

      <section>
        <h2 className="text-h3 mb-3">{t("admin.page.documents.versions")}</h2>
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
                  {v.is_current
                    ? ` · ${t("admin.page.documents.currentTag")}`
                    : ""}
                </Link>
                <span className="text-muted">
                  {formatDateTime(v.created_at, locale)}
                  {v.change_summary ? ` · ${v.change_summary}` : ""}
                </span>
              </li>
            ),
          )}
        </ul>
        {hasPermission(ctx.role, "documents.manage_versions") ? (
          <div>
            <h3 className="font-medium mb-2">
              {t("admin.page.documents.uploadNewVersion")}
            </h3>
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
        <h2 className="text-h3 mb-3">
          {t("admin.page.documents.recentDownloads")}
        </h2>
        {downloads.length === 0 ? (
          <p className="text-muted text-small">
            {t("admin.page.documents.noDownloads")}
          </p>
        ) : (
          <ul className="text-small space-y-1">
            {downloads.map(
              (d: {
                id: string;
                actor_audience: string;
                created_at: string;
              }) => (
                <li key={d.id}>
                  {d.actor_audience} · {formatDateTime(d.created_at, locale)}
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
            {t("admin.page.documents.archiveDocument")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
