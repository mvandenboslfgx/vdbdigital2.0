"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  commitProductImportAction,
  previewProductImportAction,
  type CatalogActionState,
} from "@/server/actions/catalog-actions";

const initial: CatalogActionState = {};

export function ProductImportPanel({ canImport }: { canImport: boolean }) {
  const [csv, setCsv] = useState("");
  const [previewState, previewAction, previewPending] = useActionState(
    previewProductImportAction,
    initial,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitProductImportAction,
    initial,
  );

  if (!canImport) {
    return (
      <p className="text-muted text-small">
        U heeft geen importrechten.
      </p>
    );
  }

  const report = commitState.importPreview ?? previewState.importPreview;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-h1 mb-1">Productimport</h1>
        <p className="text-muted text-small">
          CSV-import met verplichte preview. Alles wordt als concept opgeslagen. Juridische
          goedkeuring en checkout eligibility worden nooit geïmporteerd.
        </p>
      </div>

      <Textarea
        label="CSV-inhoud"
        rows={12}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="sku,name,slug,category,price_cents,price_mode,billing_model,status,..."
      />

      <div className="flex flex-wrap gap-2">
        <form
          action={(fd) => {
            fd.set("csv", csv);
            previewAction(fd);
          }}
        >
          <Button type="submit" variant="secondary" disabled={previewPending}>
            Preview valideren
          </Button>
        </form>
        <form
          action={(fd) => {
            fd.set("csv", csv);
            commitAction(fd);
          }}
        >
          <Button type="submit" disabled={commitPending || !previewState.success}>
            Import uitvoeren als concept
          </Button>
        </form>
      </div>

      {(previewState.error || commitState.error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small" role="alert">
          {previewState.error || commitState.error}
        </div>
      )}

      {commitState.warnings?.map((w) => (
        <p key={w} className="text-small text-amber-900">
          {w}
        </p>
      ))}

      {report && (
        <ul className="text-small space-y-1 rounded-lg border border-border p-4">
          {report.map((r) => (
            <li key={`${r.row}-${r.message}`} className={r.ok ? "text-emerald-800" : "text-rose-800"}>
              Rij {r.row}: {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
