"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createQuoteAction,
  updateQuoteAction,
  type QuoteActionState,
} from "@/server/actions/quote-actions";
import { lineTotals, quoteHeaderTotals } from "@/lib/commerce/quote-money";
import type { QuoteEditorLabels } from "@/lib/admin/line-item-editor-labels";

type ItemDraft = {
  title: string;
  description: string;
  itemType: "SERVICE" | "PRODUCT" | "ADDON" | "DISCOUNT" | "CUSTOM";
  quantity: number;
  unitLabel: string;
  unitPriceCents: number;
  discountCents: number;
  taxRateBasisPoints: number;
  isOptional: boolean;
  sortOrder: number;
};

const emptyItem = (): ItemDraft => ({
  title: "",
  description: "",
  itemType: "SERVICE",
  quantity: 1,
  unitLabel: "stuk",
  unitPriceCents: 0,
  discountCents: 0,
  taxRateBasisPoints: 2100,
  isOptional: false,
  sortOrder: 0,
});

function eurosToCents(value: string): number {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function QuoteEditorForm({
  mode,
  organizations,
  quote,
  initialItems,
  labels,
}: {
  mode: "create" | "edit";
  organizations: { id: string; label: string }[];
  /** Resolved server-side; this editor does no dictionary lookups. */
  labels: QuoteEditorLabels;
  quote?: {
    id: string;
    version: number;
    organization_id: string;
    project_id: string | null;
    title: string;
    description: string | null;
    valid_until: string | null;
    terms_version: string | null;
    discount_cents: number;
  };
  initialItems?: ItemDraft[];
}) {
  const action = mode === "create" ? createQuoteAction : updateQuoteAction;
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(
    action,
    {},
  );
  const [items, setItems] = useState<ItemDraft[]>(
    initialItems?.length ? initialItems : [emptyItem()],
  );
  const [headerDiscountEuros, setHeaderDiscountEuros] = useState(
    centsToEuros(quote?.discount_cents ?? 0),
  );

  const preview = useMemo(() => {
    return quoteHeaderTotals(
      items.map((i) => ({
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        discountCents: i.discountCents,
        taxRateBasisPoints: i.taxRateBasisPoints,
        isOptional: i.isOptional,
        isSelected: !i.isOptional,
      })),
      eurosToCents(headerDiscountEuros),
    );
  }, [items, headerDiscountEuros]);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && quote ? (
        <>
          <input type="hidden" name="quoteId" value={quote.id} />
          <input type="hidden" name="expectedVersion" value={quote.version} />
        </>
      ) : null}
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
      <input
        type="hidden"
        name="discountCents"
        value={eurosToCents(headerDiscountEuros)}
      />

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-green-700" role="status">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="organizationId">
            {labels.organization}
          </label>
          <select
            id="organizationId"
            name="organizationId"
            required={mode === "create"}
            disabled={mode === "edit"}
            defaultValue={quote?.organization_id}
            className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="projectId">
            {labels.projectOptional}
          </label>
          <Input
            id="projectId"
            name="projectId"
            defaultValue={quote?.project_id ?? ""}
            placeholder={labels.projectPlaceholder}
          />
        </div>
      </div>

      <div>
        <label className="block text-small font-medium mb-1" htmlFor="title">
          {labels.title}
        </label>
        <Input id="title" name="title" required defaultValue={quote?.title} maxLength={200} />
      </div>
      <div>
        <label className="block text-small font-medium mb-1" htmlFor="description">
          {labels.description}
        </label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={quote?.description ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="validUntil">
            {labels.validUntil}
          </label>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={quote?.valid_until ?? ""}
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="termsVersion">
            {labels.termsVersion}
          </label>
          <Input
            id="termsVersion"
            name="termsVersion"
            defaultValue={quote?.terms_version ?? "v1"}
            placeholder="v1"
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="headerDiscount">
            {labels.discountAmount}
          </label>
          <Input
            id="headerDiscount"
            value={headerDiscountEuros}
            onChange={(e) => setHeaderDiscountEuros(e.target.value)}
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-h3">{labels.linesHeading}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            {labels.addLine}
          </Button>
        </div>
        {items.map((item, idx) => {
          const t = lineTotals(item);
          return (
            <div
              key={idx}
              className="rounded-xl border border-border p-4 grid gap-3 sm:grid-cols-2"
            >
              <Input
                placeholder={labels.title}
                value={item.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setItems((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, title: v } : row)),
                  );
                }}
              />
              <select
                value={item.itemType}
                className="min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
                onChange={(e) => {
                  const v = e.target.value as ItemDraft["itemType"];
                  setItems((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, itemType: v } : row)),
                  );
                }}
              >
                <option value="SERVICE">{labels.itemType.SERVICE}</option>
                <option value="PRODUCT">{labels.itemType.PRODUCT}</option>
                <option value="ADDON">{labels.itemType.ADDON}</option>
                <option value="CUSTOM">{labels.itemType.CUSTOM}</option>
                <option value="DISCOUNT">{labels.itemType.DISCOUNT}</option>
              </select>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={item.quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, quantity: v } : row,
                    ),
                  );
                }}
              />
              <Input
                value={centsToEuros(item.unitPriceCents)}
                onChange={(e) => {
                  const v = eurosToCents(e.target.value);
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, unitPriceCents: v } : row,
                    ),
                  );
                }}
                placeholder={labels.priceExclVat}
              />
              <label className="flex items-center gap-2 text-small sm:col-span-2">
                <input
                  type="checkbox"
                  checked={item.isOptional}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, isOptional: v } : row,
                      ),
                    );
                  }}
                />
                {labels.optionalLine}
              </label>
              <p className="text-small text-muted sm:col-span-2">
                {labels.lineTotalTemplate.replace(
                  "{amount}",
                  centsToEuros(t.totalCents),
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                {labels.remove}
              </Button>
            </div>
          );
        })}
      </section>

      <div className="rounded-xl border border-border p-4 text-small space-y-1">
        <p>
          {labels.subtotalPreview}: €{centsToEuros(preview.subtotalCents)}
        </p>
        <p>
          {labels.vatPreview}: €{centsToEuros(preview.taxCents)}
        </p>
        <p className="font-semibold">
          {labels.totalPreview}: €{centsToEuros(preview.totalCents)}
        </p>
        <p className="text-muted">{labels.previewNotAuthoritative}</p>
      </div>

      <Button type="submit" disabled={pending || items.length === 0}>
        {pending
          ? labels.saving
          : mode === "create"
            ? labels.submitCreate
            : labels.submitEdit}
      </Button>
    </form>
  );
}
