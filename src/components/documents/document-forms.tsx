"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getPortalDocumentDownloadAction,
  getStaffDocumentDownloadAction,
  updateDocumentVisibilityAction,
  uploadDocumentAction,
  uploadPortalDocumentAction,
  type DocumentActionState,
} from "@/server/actions/document-actions";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  formatBytes,
} from "@/lib/validation/documents";
import {
  DOCUMENT_CATEGORY_NL,
  DOCUMENT_VISIBILITY_NL,
  labelNl,
} from "@/lib/portal/labels";

function Msg({ state }: { state: DocumentActionState }) {
  if (state.error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="text-sm text-green-700" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

export function AdminDocumentUploadForm({
  organizations,
  defaultOrganizationId,
  defaultProjectId,
  parentDocumentId,
}: {
  organizations: { id: string; label: string }[];
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  parentDocumentId?: string;
}) {
  const [state, action, pending] = useActionState(uploadDocumentAction, {});
  const [fileLabel, setFileLabel] = useState<string>("");

  return (
    <form action={action} className="space-y-4 max-w-xl">
      <Msg state={state} />
      {parentDocumentId ? (
        <input type="hidden" name="parentDocumentId" value={parentDocumentId} />
      ) : null}
      {defaultProjectId ? (
        <input type="hidden" name="projectId" value={defaultProjectId} />
      ) : null}

      <div>
        <label htmlFor="organizationId" className="block text-small font-medium mb-1">
          Organisatie
        </label>
        <select
          id="organizationId"
          name="organizationId"
          required
          defaultValue={defaultOrganizationId}
          className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {!defaultProjectId ? (
        <div>
          <label htmlFor="projectId" className="block text-small font-medium mb-1">
            Project (optioneel)
          </label>
          <Input id="projectId" name="projectId" placeholder="Project-UUID" />
        </div>
      ) : null}

      <div>
        <label htmlFor="title" className="block text-small font-medium mb-1">
          Titel
        </label>
        <Input id="title" name="title" required maxLength={200} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-small font-medium mb-1">
            Categorie
          </label>
          <select
            id="category"
            name="category"
            defaultValue="GENERAL"
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelNl(DOCUMENT_CATEGORY_NL, c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visibility" className="block text-small font-medium mb-1">
            Zichtbaarheid
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue="INTERNAL"
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {DOCUMENT_VISIBILITIES.filter((v) => v !== "CUSTOMER_UPLOAD").map(
              (v) => (
                <option key={v} value={v}>
                  {labelNl(DOCUMENT_VISIBILITY_NL, v)}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-small font-medium mb-1">
          Omschrijving
        </label>
        <Textarea id="description" name="description" rows={3} maxLength={2000} />
      </div>

      <div>
        <label htmlFor="file" className="block text-small font-medium mb-1">
          Bestand
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="block w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileLabel(
              f ? `${f.name} (${formatBytes(f.size)})` : "",
            );
          }}
        />
        {fileLabel ? (
          <p className="text-small text-muted mt-1">{fileLabel}</p>
        ) : (
          <p className="text-small text-muted mt-1">
            PDF, afbeeldingen, DOCX/XLSX, CSV of ZIP (staff). Max. 25–50 MB.
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Uploaden…" : parentDocumentId ? "Nieuwe versie uploaden" : "Uploaden"}
      </Button>
    </form>
  );
}

export function DocumentDownloadButton({
  documentId,
  audience,
}: {
  documentId: string;
  audience: "staff" | "customer";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result =
              audience === "staff"
                ? await getStaffDocumentDownloadAction(documentId)
                : await getPortalDocumentDownloadAction(documentId);
            if (result.error || !result.downloadUrl) {
              setError(result.error ?? "Download mislukt.");
              return;
            }
            window.location.assign(result.downloadUrl);
          });
        }}
      >
        {pending ? "Bezig…" : "Downloaden"}
      </Button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function VisibilityForm({
  documentId,
  version,
  visibility,
}: {
  documentId: string;
  version: number;
  visibility: string;
}) {
  const [state, action, pending] = useActionState(
    updateDocumentVisibilityAction,
    {},
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <div>
        <label htmlFor="visibility" className="block text-small font-medium mb-1">
          Zichtbaarheid
        </label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={visibility}
          className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
        >
          {DOCUMENT_VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {labelNl(DOCUMENT_VISIBILITY_NL, v)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Opslaan…" : "Bijwerken"}
      </Button>
      <Msg state={state} />
    </form>
  );
}

export function PortalUploadForm({ projectId }: { projectId?: string }) {
  const [state, action, pending] = useActionState(
    uploadPortalDocumentAction,
    {},
  );
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Bestand aanleveren</h3>
      <Msg state={state} />
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
      <Input name="title" required maxLength={200} placeholder="Titel" />
      <input name="file" type="file" required className="block w-full text-sm" />
      <Button type="submit" disabled={pending}>
        {pending ? "Uploaden…" : "Uploaden"}
      </Button>
    </form>
  );
}
