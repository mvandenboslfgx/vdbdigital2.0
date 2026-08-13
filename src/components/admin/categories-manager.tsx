"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCategoryAction,
  saveCategoryAction,
  type CatalogActionState,
} from "@/server/actions/catalog-actions";
import type { CategoriesManagerLabels } from "@/lib/admin/catalog-manager-labels";
import type { Category } from "@/types";

const initial: CatalogActionState = {};

export function CategoriesManager({
  categories,
  canManage,
  labels,
}: {
  categories: Category[];
  canManage: boolean;
  /** Resolved server-side; this component does no dictionary lookups. */
  labels: CategoriesManagerLabels;
}) {
  const [state, action, pending] = useActionState(saveCategoryAction, initial);
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 mb-1">{labels.title}</h1>
        <p className="text-muted text-small">{labels.subtitle}</p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small" role="alert">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-small">
          {labels.saved}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-small">
          <thead className="bg-surface-elevated text-left">
            <tr>
              <th className="p-3">{labels.colName}</th>
              <th className="p-3">{labels.colSlug}</th>
              <th className="p-3">{labels.colNameNl}</th>
              <th className="p-3">{labels.colProducts}</th>
              <th className="p-3">{labels.colActive}</th>
              <th className="p-3">{labels.colOrder}</th>
              <th className="p-3">{labels.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted">{c.slug}</td>
                <td className="p-3">{c.nameNl || labels.empty}</td>
                <td className="p-3">{c.productCount ?? 0}</td>
                <td className="p-3">{c.isActive === false ? labels.no : labels.yes}</td>
                <td className="p-3">{c.sortOrder}</td>
                <td className="p-3 space-x-2">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="text-primary"
                        onClick={() => setEditing(c)}
                      >
                        {labels.edit}
                      </button>
                      <form
                        action={async (formData) => {
                          await deleteCategoryAction({}, formData);
                        }}
                        className="inline"
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-danger">
                          {labels.delete}
                        </button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <form
          className="space-y-4 rounded-lg border border-border p-4 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              id: editing?.id,
              slug: String(fd.get("slug")),
              name: String(fd.get("name")),
              description: String(fd.get("description") ?? ""),
              nameNl: String(fd.get("nameNl") ?? "") || null,
              descriptionNl: String(fd.get("descriptionNl") ?? "") || null,
              sortOrder: Number(fd.get("sortOrder") ?? 0),
              isActive: fd.get("isActive") === "on",
              imagePath: String(fd.get("imagePath") ?? "") || null,
            };
            const out = new FormData();
            out.set("payload", JSON.stringify(payload));
            action(out);
            setEditing(null);
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-semibold">
            {editing
              ? labels.editHeadingTemplate.replace("{name}", editing.name)
              : labels.createHeading}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="name" label={labels.fieldName} required defaultValue={editing?.name} key={`n-${editing?.id}`} />
            <Input name="slug" label={labels.fieldSlug} required defaultValue={editing?.slug} key={`s-${editing?.id}`} />
            <Input name="nameNl" label={labels.fieldNameNl} defaultValue={editing?.nameNl ?? ""} key={`nn-${editing?.id}`} />
            <Input name="sortOrder" label={labels.fieldOrder} type="number" defaultValue={editing?.sortOrder ?? 0} key={`o-${editing?.id}`} />
            <Input name="imagePath" label={labels.fieldImagePath} defaultValue={editing?.imagePath ?? ""} key={`i-${editing?.id}`} />
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive !== false} />
              {labels.fieldActive}
            </label>
            <div className="md:col-span-2">
              <Textarea name="description" label={labels.fieldDescription} rows={3} defaultValue={editing?.description} key={`d-${editing?.id}`} />
            </div>
            <div className="md:col-span-2">
              <Textarea name="descriptionNl" label={labels.fieldDescriptionNl} rows={3} defaultValue={editing?.descriptionNl ?? ""} key={`dn-${editing?.id}`} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {labels.save}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {labels.cancel}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
