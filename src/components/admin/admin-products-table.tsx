"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AudienceBadges,
  EligibilityBadge,
  PriceModeBadge,
  StatusBadge,
} from "@/components/admin/catalog-badges";
import { formatPriceLabel } from "@/lib/utilities/money";
import { bulkProductAction, exportProductsCsvAction } from "@/server/actions/catalog-actions";
import { formatDate } from "@/i18n/format-date";
import type { ProductsTableLabels } from "@/lib/admin/products-table-labels";
import type { Product } from "@/types";

export interface ProductListRow extends Product {
  priceModeLabel: string;
  checkoutBlockedReasons: string[];
  directlySellable: boolean;
  b2bLegal: boolean;
  b2cLegal: boolean;
  legacyRemoved?: boolean;
  legacyStatusLabel?: string;
}

interface Props {
  rows: ProductListRow[];
  total: number;
  page: number;
  pageSize: number;
  categories: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canExport: boolean;
  canBulk: boolean;
  schemaExtended: boolean;
  error?: string;
  labels: ProductsTableLabels;
}

export function AdminProductsTable({
  rows,
  total,
  page,
  pageSize,
  categories,
  canCreate,
  canExport,
  canBulk,
  schemaExtended,
  error,
  labels,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queryDefaults = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "ALL",
      priceMode: searchParams.get("priceMode") ?? "ALL",
      billingType: searchParams.get("billingType") ?? "ALL",
      audience: searchParams.get("audience") ?? "ALL",
      categoryId: searchParams.get("categoryId") ?? "",
      partnerHealth: searchParams.get("partnerHealth") ?? "ALL",
      sort: searchParams.get("sort") ?? "sort_order",
    }),
    [searchParams],
  );

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "ALL") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    router.push(`/admin/products?${params.toString()}`);
  }

  function toggleAll() {
    if (selected.length === rows.length) setSelected([]);
    else setSelected(rows.map((r) => r.id));
  }

  function runBulk(action: "hide" | "archive" | "set_category", categoryId?: string) {
    if (!canBulk || selected.length === 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({
          productIds: selected,
          action,
          categoryId,
        }),
      );
      const result = await bulkProductAction({}, fd);
      setMessage(result.error ?? labels.bulkDone);
      if (result.success) {
        setSelected([]);
        router.refresh();
      }
    });
  }

  async function onExport() {
    startTransition(async () => {
      const result = await exportProductsCsvAction();
      if (result.error || !result.csv) {
        setMessage(result.error ?? labels.exportFailed);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${labels.exportFileStem}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 mb-1">{labels.title}</h1>
          <p className="text-muted text-small max-w-2xl">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <Button type="button" variant="outline" disabled={pending} onClick={onExport}>
              {labels.exportCsv}
            </Button>
          )}
          {canCreate && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center gap-2 font-medium min-h-11 px-5 py-2.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover"
            >
              {labels.newProduct}
            </Link>
          )}
        </div>
      </div>

      {!schemaExtended && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950">
          {labels.migrationNotApplied}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-900" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-small">
          {message}
        </div>
      )}

      <form
        className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          pushFilters({
            q: String(fd.get("q") ?? ""),
            status: String(fd.get("status") ?? "ALL"),
            priceMode: String(fd.get("priceMode") ?? "ALL"),
            billingType: String(fd.get("billingType") ?? "ALL"),
            audience: String(fd.get("audience") ?? "ALL"),
            categoryId: String(fd.get("categoryId") ?? ""),
            partnerHealth: String(fd.get("partnerHealth") ?? "ALL"),
            sort: String(fd.get("sort") ?? "sort_order"),
          });
        }}
      >
        <Input
          name="q"
          label={labels.search}
          defaultValue={queryDefaults.q}
          placeholder={labels.searchPlaceholder}
        />
        <label className="space-y-1.5 text-small font-medium">
          {labels.status}
          <select name="status" defaultValue={queryDefaults.status} className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
            <option value="ALL">{labels.all}</option>
            {labels.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-small font-medium">
          {labels.priceMode}
          <select name="priceMode" defaultValue={queryDefaults.priceMode} className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
            <option value="ALL">{labels.all}</option>
            {labels.priceModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-small font-medium">
          {labels.billingType}
          <select name="billingType" defaultValue={queryDefaults.billingType} className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
            <option value="ALL">{labels.all}</option>
            {labels.billingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-small font-medium">
          {labels.audience}
          <select name="audience" defaultValue={queryDefaults.audience} className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
            <option value="ALL">{labels.all}</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
            <option value="BOTH">{labels.audienceBoth}</option>
          </select>
        </label>
        <label className="space-y-1.5 text-small font-medium">
          {labels.partnerHealth}
          <select
            name="partnerHealth"
            defaultValue={queryDefaults.partnerHealth}
            className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
          >
            <option value="ALL">{labels.all}</option>
            <option value="COMMISSION_CONFIGURATION_REQUIRED">
              COMMISSION_CONFIGURATION_REQUIRED
            </option>
            <option value="LEGAL_REVIEW_REQUIRED">LEGAL_REVIEW_REQUIRED</option>
            <option value="OWN_SERVICES_READY">OWN_SERVICES_READY</option>
            <option value="HIDDEN_BLOCKED">HIDDEN / BLOCKED</option>
          </select>
        </label>
        <label className="space-y-1.5 text-small font-medium">
          {labels.category}
          <select name="categoryId" defaultValue={queryDefaults.categoryId} className="w-full min-h-11 rounded-lg border border-border bg-surface px-3">
            <option value="">{labels.all}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-3 xl:col-span-6 flex gap-2">
          <Button type="submit" variant="secondary">
            {labels.filter}
          </Button>
          <input type="hidden" name="sort" value={queryDefaults.sort} />
        </div>
      </form>

      {canBulk && selected.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-small text-muted">
            {labels.selectedCount.replace("{count}", String(selected.length))}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runBulk("hide")}>
            {labels.hide}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runBulk("archive")}>
            {labels.archive}
          </Button>
          {categories[0] && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk("set_category", categories[0].id)}
            >
              {labels.setCategory.replace("{name}", categories[0].name)}
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium mb-1">{labels.emptyTitle}</p>
          <p className="text-small text-muted mb-4">{labels.emptyDescription}</p>
          {canCreate && (
            <Link href="/admin/products/new" className="text-primary text-small font-medium">
              {labels.newProduct}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-small">
              <thead className="bg-surface-elevated text-left">
                <tr>
                  <th className="p-3 w-10">
                    <input type="checkbox" aria-label={labels.selectAll} onChange={toggleAll} checked={selected.length === rows.length && rows.length > 0} />
                  </th>
                  <th className="p-3">{labels.colProduct}</th>
                  <th className="p-3">{labels.colSku}</th>
                  <th className="p-3">{labels.colCategory}</th>
                  <th className="p-3">{labels.colPrice}</th>
                  <th className="p-3">{labels.colType}</th>
                  <th className="p-3">{labels.colBilling}</th>
                  <th className="p-3">{labels.colAudience}</th>
                  <th className="p-3">{labels.colStatus}</th>
                  <th className="p-3">{labels.colCheckout}</th>
                  <th className="p-3">{labels.colChanged}</th>
                  <th className="p-3">{labels.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() =>
                          setSelected((prev) =>
                            prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                          )
                        }
                        aria-label={labels.selectRow.replace("{name}", row.name)}
                      />
                    </td>
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-muted">{row.internalSku ?? labels.empty}</td>
                    <td className="p-3">{row.categoryName || labels.empty}</td>
                    <td className="p-3">
                      {formatPriceLabel(
                        row.priceCents,
                        row.fromPriceCents,
                        row.billingType,
                        labels.locale,
                      )}
                    </td>
                    <td className="p-3">
                      <PriceModeBadge mode={row.priceModeLabel} labels={labels.badges} />
                    </td>
                    <td className="p-3">{row.billingType}</td>
                    <td className="p-3">
                      <AudienceBadges
                        b2b={row.audienceB2b ?? true}
                        b2c={row.audienceB2c ?? false}
                        b2bLegal={row.b2bLegal}
                        b2cLegal={row.b2cLegal}
                        labels={labels.badges}
                      />
                    </td>
                    <td className="p-3">
                      {row.legacyRemoved && row.legacyStatusLabel ? (
                        <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-900">
                          {row.legacyStatusLabel}
                        </span>
                      ) : (
                        <StatusBadge status={row.status} labels={labels.badges} />
                      )}
                    </td>
                    <td className="p-3">
                      <EligibilityBadge
                        sellable={row.directlySellable}
                        labels={labels.badges}
                      />
                      <ul className="mt-1 text-[11px] text-muted space-y-0.5 max-w-[14rem]">
                        {row.checkoutBlockedReasons.slice(0, 3).map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 text-muted whitespace-nowrap">
                      {formatDate(row.updatedAt, labels.locale, labels.empty)}
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/products/${row.id}`} className="text-primary font-medium">
                        {labels.edit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <h2 className="font-medium">{row.name}</h2>
                  {row.legacyRemoved && row.legacyStatusLabel ? (
                    <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-900">
                      {row.legacyStatusLabel}
                    </span>
                  ) : (
                    <StatusBadge status={row.status} labels={labels.badges} />
                  )}
                </div>
                <p className="text-small text-muted">
                  {row.categoryName || labels.noCategory} ·{" "}
                  {row.internalSku ?? labels.noSku}
                </p>
                <p className="text-small">
                  {formatPriceLabel(
                    row.priceCents,
                    row.fromPriceCents,
                    row.billingType,
                    labels.locale,
                  )}
                </p>
                <EligibilityBadge
                  sellable={row.directlySellable}
                  labels={labels.badges}
                />
                <ul className="text-[11px] text-muted space-y-0.5">
                  {row.checkoutBlockedReasons.slice(0, 4).map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
                <Link href={`/admin/products/${row.id}`} className="inline-block text-primary text-small font-medium">
                  {labels.edit}
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-small">
        <p className="text-muted">
          {(total === 1 ? labels.countOne : labels.countOther)
            .replace("{count}", String(total))
            .replace("{page}", String(page))
            .replace("{totalPages}", String(totalPages))}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(page - 1));
              router.push(`/admin/products?${params.toString()}`);
            }}
          >
            {labels.previous}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(page + 1));
              router.push(`/admin/products?${params.toString()}`);
            }}
          >
            {labels.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
