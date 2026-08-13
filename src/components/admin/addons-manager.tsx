"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAddonAction, type CatalogActionState } from "@/server/actions/catalog-actions";
import type { AddonsManagerLabels } from "@/lib/admin/catalog-manager-labels";
import type { ProductAddon } from "@/types";

const initial: CatalogActionState = {};

export function AddonsManager({
  addons,
  canManage,
  labels,
}: {
  addons: ProductAddon[];
  canManage: boolean;
  /** Resolved server-side; this component does no dictionary lookups. */
  labels: AddonsManagerLabels;
}) {
  const [state, action, pending] = useActionState(saveAddonAction, initial);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 mb-1">{labels.heading}</h1>
        <p className="text-muted text-small max-w-2xl">{labels.subtitle}</p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small" role="alert">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        {addons.length === 0 ? (
          <p className="text-muted text-small">{labels.emptyState}</p>
        ) : (
          addons.map((a) => (
            <article key={a.id} className="rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-small text-muted">
                  {a.slug} · {a.priceMode} · {a.billingType} ·{" "}
                  {a.isActive ? labels.active : labels.inactive}
                </p>
              </div>
              <p className="text-small">
                {a.priceCents !== null
                  ? `€ ${(a.priceCents / 100).toFixed(2)}`
                  : labels.quotePrice}
              </p>
            </article>
          ))
        )}
      </div>

      {canManage && (
        <form
          className="space-y-4 rounded-lg border border-border p-4 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const euros = String(fd.get("priceEuros") ?? "").trim();
            let priceCents: number | null = null;
            if (euros) {
              const n = euros.replace(",", ".");
              if (/^\d+(\.\d{1,2})?$/.test(n)) {
                const [w, f = ""] = n.split(".");
                priceCents =
                  Number.parseInt(w, 10) * 100 +
                  Number.parseInt((f + "00").slice(0, 2), 10);
              }
            }
            const payload = {
              slug: String(fd.get("slug")),
              name: String(fd.get("name")),
              description: String(fd.get("description") ?? ""),
              nameNl: String(fd.get("nameNl") ?? "") || null,
              descriptionNl: String(fd.get("descriptionNl") ?? "") || null,
              priceCents,
              priceMode: String(fd.get("priceMode")),
              billingType: String(fd.get("billingType")),
              audienceB2b: fd.get("audienceB2b") === "on",
              audienceB2c: fd.get("audienceB2c") === "on",
              isActive: fd.get("isActive") === "on",
              sortOrder: Number(fd.get("sortOrder") ?? 0),
            };
            const out = new FormData();
            out.set("payload", JSON.stringify(payload));
            action(out);
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-semibold">{labels.createHeading}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="name" label={labels.fieldName} required />
            <Input name="slug" label={labels.fieldSlug} required />
            <Input name="nameNl" label={labels.fieldNameNl} />
            <Input name="priceEuros" label={labels.fieldPrice} />
            <label className="space-y-1.5 text-small font-medium">
              {labels.fieldPriceMode}
              <select name="priceMode" defaultValue="QUOTE_ONLY" className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
                <option value="FIXED">FIXED</option>
                <option value="STARTING_FROM">STARTING_FROM</option>
                <option value="QUOTE_ONLY">QUOTE_ONLY</option>
              </select>
            </label>
            <label className="space-y-1.5 text-small font-medium">
              {labels.fieldBillingLabel}
              <select name="billingType" defaultValue="ONE_TIME" className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
                <option value="ONE_TIME">{labels.billing.ONE_TIME}</option>
                <option value="MONTHLY">{labels.billing.MONTHLY}</option>
                <option value="YEARLY">{labels.billing.YEARLY}</option>
                <option value="QUOTE_ONLY">{labels.billing.QUOTE_ONLY}</option>
              </select>
            </label>
            <Input name="sortOrder" label={labels.fieldOrder} type="number" defaultValue={0} />
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="audienceB2b" defaultChecked /> B2B
            </label>
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="audienceB2c" /> B2C
            </label>
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="isActive" defaultChecked /> {labels.fieldActive}
            </label>
            <div className="md:col-span-2">
              <Textarea name="description" label={labels.fieldDescription} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Textarea name="descriptionNl" label={labels.fieldDescriptionNl} rows={3} />
            </div>
          </div>
          <p className="text-small text-muted">{labels.recurringNote}</p>
          <Button type="submit" disabled={pending}>
            {labels.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
