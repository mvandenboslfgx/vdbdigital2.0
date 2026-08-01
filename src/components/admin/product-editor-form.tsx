"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createProductAction,
  updateProductAction,
  publishProductAction,
  updateLegalApprovalAction,
  archiveProductAction,
  restoreProductAction,
  duplicateProductAction,
  deleteProductAction,
  type CatalogActionState,
} from "@/server/actions/catalog-actions";
import { billingWarningNl } from "@/lib/commerce/catalog-admin-eligibility";
import { LEGACY_TAWK_ADMIN_STATUS_LABEL } from "@/lib/commerce/tawk-legacy-blocklist";
import { TranslationWorkflowPanel } from "@/components/admin/translation-workflow-panel";
import type { TranslationPanelLabels } from "@/lib/admin/translation-panel-labels";
import type { ProductEditorLabels } from "@/lib/admin/product-editor-labels";
import { formatDateTime } from "@/i18n/format-date";
import { locales } from "@/i18n/config";
import type { BillingType, PriceMode, Product, ProductTranslationStatus } from "@/types";
import type { PublicationCheckItem } from "@/lib/commerce/publication-checklist";

type CategoryOption = { id: string; name: string };

interface Props {
  mode: "create" | "edit";
  product?: Product;
  categories: CategoryOption[];
  checklist?: PublicationCheckItem[];
  canPublish: boolean;
  canChangePrice: boolean;
  canLegal: boolean;
  canArchive: boolean;
  blockReasons: string[];
  legacyRemoved?: boolean;
  /** Resolved server-side; the panel itself does no dictionary lookups. */
  translationLabels: TranslationPanelLabels;
  /** Resolved server-side; this editor does no dictionary lookups. */
  labels: ProductEditorLabels;
}

const initialState: CatalogActionState = {};

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ProductEditorForm({
  mode,
  product,
  categories,
  checklist = [],
  canPublish,
  canChangePrice,
  canLegal,
  canArchive,
  blockReasons,
  legacyRemoved = false,
  translationLabels,
  labels,
}: Props) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(
    createProductAction,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateProductAction,
    initialState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishProductAction,
    initialState,
  );
  const [legalState, legalAction, legalPending] = useActionState(
    updateLegalApprovalAction,
    initialState,
  );

  const state = mode === "create" ? createState : updateState;
  const pending = createPending || updatePending || publishPending || legalPending;

  const [priceMode, setPriceMode] = useState<PriceMode>(
    product?.priceMode ??
      (product?.fromPriceCents != null
        ? "STARTING_FROM"
        : product?.priceCents != null
          ? "FIXED"
          : "QUOTE_ONLY"),
  );
  const [billingType, setBillingType] = useState<BillingType>(
    product?.billingType ?? "ONE_TIME",
  );
  const [dirty, setDirty] = useState(false);

  const billingWarn = useMemo(() => billingWarningNl(billingType), [billingType]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (createState.success && createState.productId) {
      router.push(`/admin/products/${createState.productId}`);
    } else if (updateState.success) {
      router.refresh();
    }
  }, [createState.success, createState.productId, updateState.success, router]);

  function buildPayload(form: HTMLFormElement) {
    const fd = new FormData(form);
    const euros = String(fd.get("amountEuros") ?? "").trim();
    const fromEuros = String(fd.get("fromAmountEuros") ?? "").trim();
    const toCents = (v: string) => {
      if (!v) return null;
      const normalized = v.replace(",", ".");
      if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
      const [w, f = ""] = normalized.split(".");
      return Number.parseInt(w, 10) * 100 + Number.parseInt((f + "00").slice(0, 2), 10);
    };

    return {
      id: product?.id,
      expectedVersion: product?.version ?? 1,
      name: String(fd.get("name") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      internalSku: String(fd.get("internalSku") ?? "") || null,
      shortDescription: String(fd.get("shortDescription") ?? ""),
      fullDescription: String(fd.get("fullDescription") ?? ""),
      categoryId: String(fd.get("categoryId") ?? "") || null,
      badge: String(fd.get("badge") ?? "") || null,
      tags: String(fd.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      featured: fd.get("featured") === "on",
      deliveryTime: String(fd.get("deliveryTime") ?? ""),
      includedItems: linesToArray(String(fd.get("includedItems") ?? "")),
      excludedItems: linesToArray(String(fd.get("excludedItems") ?? "")),
      extensions: linesToArray(String(fd.get("extensions") ?? "")),
      benefits: linesToArray(String(fd.get("benefits") ?? "")),
      targetAudience: String(fd.get("targetAudience") ?? ""),
      workflow: String(fd.get("workflow") ?? ""),
      requiredInput: linesToArray(String(fd.get("requiredInput") ?? "")),
      ctaLabel: String(fd.get("ctaLabel") ?? "") || null,
      quoteCtaLabel: String(fd.get("quoteCtaLabel") ?? "") || null,
      warnings: String(fd.get("warnings") ?? "") || null,
      seoTitle: String(fd.get("seoTitle") ?? ""),
      seoDescription: String(fd.get("seoDescription") ?? ""),
      audienceB2b: fd.get("audienceB2b") === "on",
      audienceB2c: fd.get("audienceB2c") === "on",
      translations: [
        {
          locale: "nl" as const,
          name: String(fd.get("nl_name") ?? ""),
          shortDescription: String(fd.get("nl_shortDescription") ?? ""),
          fullDescription: String(fd.get("nl_fullDescription") ?? ""),
          benefits: linesToArray(String(fd.get("nl_benefits") ?? "")),
          includedItems: linesToArray(String(fd.get("nl_includedItems") ?? "")),
          excludedItems: linesToArray(String(fd.get("nl_excludedItems") ?? "")),
          ctaLabel: String(fd.get("nl_ctaLabel") ?? "") || null,
          quoteCtaLabel: String(fd.get("nl_quoteCtaLabel") ?? "") || null,
          seoTitle: String(fd.get("nl_seoTitle") ?? "") || null,
          seoDescription: String(fd.get("nl_seoDescription") ?? "") || null,
          status: (String(fd.get("nl_status") ?? "draft") ||
            "draft") as ProductTranslationStatus,
        },
        {
          locale: "en" as const,
          name: String(fd.get("en_name") ?? ""),
          shortDescription: String(fd.get("en_shortDescription") ?? ""),
          fullDescription: String(fd.get("en_fullDescription") ?? ""),
          benefits: linesToArray(String(fd.get("en_benefits") ?? "")),
          includedItems: linesToArray(String(fd.get("en_includedItems") ?? "")),
          excludedItems: linesToArray(String(fd.get("en_excludedItems") ?? "")),
          ctaLabel: String(fd.get("en_ctaLabel") ?? "") || null,
          quoteCtaLabel: String(fd.get("en_quoteCtaLabel") ?? "") || null,
          seoTitle: String(fd.get("en_seoTitle") ?? "") || null,
          seoDescription: String(fd.get("en_seoDescription") ?? "") || null,
          status: (String(fd.get("en_status") ?? "draft") ||
            "draft") as ProductTranslationStatus,
        },
      ],
      pricing: {
        priceMode,
        billingType,
        priceCents: priceMode === "FIXED" ? toCents(euros) : null,
        fromPriceCents: priceMode === "STARTING_FROM" ? toCents(fromEuros) : null,
        compareAtCents: toCents(String(fd.get("compareAtEuros") ?? "")),
        currency: "EUR" as const,
        vatPercent: Number(fd.get("vatPercent") ?? 21),
        priceIncludesVat: fd.get("priceIncludesVat") === "on",
        priceLabel: String(fd.get("priceLabel") ?? "") || null,
        costCents: canChangePrice ? toCents(String(fd.get("costEuros") ?? "")) : null,
      },
      partnerEnabled: fd.get("partnerEnabled") === "on",
      partnerVisibility: String(fd.get("partnerVisibility") ?? "none"),
      partnerCommissionType: String(fd.get("partnerCommissionType") ?? "bps"),
      partnerCommissionValue: (() => {
        const raw = String(fd.get("partnerCommissionValue") ?? "").trim();
        if (!raw) return null;
        const n = Number(raw.replace(",", "."));
        return Number.isFinite(n) ? n : null;
      })(),
      partnerCommissionCurrency: String(fd.get("partnerCommissionCurrency") ?? "EUR") || "EUR",
      partnerCommissionStatus: String(fd.get("partnerCommissionStatus") ?? "draft"),
      partnerMinimumPriceCents: toCents(String(fd.get("partnerMinimumPriceEuros") ?? "")),
      partnerMaximumDiscountBps: (() => {
        const raw = String(fd.get("partnerMaximumDiscountBps") ?? "").trim();
        if (!raw) return null;
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
      })(),
      partnerRequiresApproval: fd.get("partnerRequiresApproval") === "on",
      partnerTerms: String(fd.get("partnerTerms") ?? "") || null,
      partnerSalesCopy: String(fd.get("partnerSalesCopy") ?? "") || null,
      partnerAvailability: String(fd.get("partnerAvailability") ?? "available"),
      partnerPriority: Number(fd.get("partnerPriority") ?? 100),
      partnerFeatured: fd.get("partnerFeatured") === "on",
    };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = buildPayload(form);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    setDirty(false);
    if (mode === "create") createAction(fd);
    else updateAction(fd);
  }

  const nl = product?.translations?.find((t) => t.locale === "nl");
  const en = product?.translations?.find((t) => t.locale === "en");

  const centsToEuros = (cents: number | null | undefined) =>
    cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);

  return (
    <div className="space-y-8" onChange={() => setDirty(true)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-small text-muted mb-1">
            <Link href="/admin/products" className="hover:text-foreground">
              {labels.breadcrumbProducts}
            </Link>{" "}
            / {mode === "create" ? labels.breadcrumbNew : labels.breadcrumbEdit}
          </p>
          <h1 className="text-h1">
            {mode === "create" ? labels.createTitle : product?.name}
          </h1>
        </div>
        {product && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/products/${product.id}/preview`}
              className="inline-flex items-center min-h-11 px-4 rounded-lg border border-border text-sm"
            >
              {labels.preview}
            </Link>
            <form
              action={async (formData) => {
                await duplicateProductAction({}, formData);
              }}
            >
              <input type="hidden" name="id" value={product.id} />
              <Button type="submit" variant="outline" disabled={legacyRemoved}>
                {labels.duplicate}
              </Button>
            </form>
          </div>
        )}
      </div>

      {legacyRemoved && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-950"
          role="status"
        >
          <p className="font-medium">{LEGACY_TAWK_ADMIN_STATUS_LABEL}</p>
          <p className="mt-1 text-muted">{labels.legacyBlockedNote}</p>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950">
        {labels.checkoutDisabledNote}
      </div>

      {(state.error || publishState.error || legalState.error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-900" role="alert">
          {state.error || publishState.error || legalState.error}
        </div>
      )}
      {(state.success || publishState.success || legalState.success) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-small text-emerald-900">
          {labels.saved}
          {(publishState.warnings ?? state.warnings)?.map((w) => (
            <p key={w} className="mt-1">
              {w}
            </p>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">{labels.generalHeading}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label={labels.name} required defaultValue={product?.name} />
            <Input name="slug" label={labels.slug} required defaultValue={product?.slug} hint={labels.slugHint} />
            <Input name="internalSku" label={labels.internalSku} defaultValue={product?.internalSku ?? ""} />
            <label className="space-y-1.5 text-small font-medium">
              {labels.category}
              <select
                name="categoryId"
                defaultValue={product?.categoryId ?? ""}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="">{labels.noCategory}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Input name="badge" label={labels.badge} defaultValue={product?.badge ?? ""} />
            <Input name="tags" label={labels.tags} defaultValue={(product?.tags ?? []).join(", ")} />
            <Input name="sortOrder" label={labels.sortOrder} type="number" defaultValue={product?.sortOrder ?? 0} />
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="featured" defaultChecked={product?.featured} />
              {labels.featured}
            </label>
          </div>
          <Textarea
            name="shortDescription"
            label={labels.shortDescription}
            required
            rows={3}
            defaultValue={product?.shortDescription}
          />
          <Textarea
            name="fullDescription"
            label={labels.fullDescription}
            required
            rows={8}
            defaultValue={product?.fullDescription}
          />
          <p className="text-small text-muted -mt-2">{labels.richTextHint}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">{labels.pricingHeading}</h2>
          {!canChangePrice && (
            <p className="text-small text-muted">{labels.noPricePermission}</p>
          )}
          <fieldset disabled={!canChangePrice && mode === "edit"} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-small font-medium">
              {labels.priceMode}
              <select
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as PriceMode)}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="FIXED">{labels.priceModeOptions.FIXED}</option>
                <option value="STARTING_FROM">{labels.priceModeOptions.STARTING_FROM}</option>
                <option value="QUOTE_ONLY">{labels.priceModeOptions.QUOTE_ONLY}</option>
              </select>
            </label>
            <label className="space-y-1.5 text-small font-medium">
              {labels.billingModel}
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="ONE_TIME">{labels.billingOptions.ONE_TIME}</option>
                <option value="MONTHLY">{labels.billingOptions.MONTHLY}</option>
                <option value="YEARLY">{labels.billingOptions.YEARLY}</option>
                <option value="QUOTE_ONLY">QUOTE_ONLY</option>
                <option value="FREE">FREE</option>
              </select>
            </label>
            {priceMode === "FIXED" && (
              <Input
                name="amountEuros"
                label={labels.amount}
                defaultValue={centsToEuros(product?.priceCents)}
                hint={labels.amountHint}
              />
            )}
            {priceMode === "STARTING_FROM" && (
              <Input
                name="fromAmountEuros"
                label={labels.fromAmount}
                defaultValue={centsToEuros(product?.fromPriceCents)}
              />
            )}
            <Input
              name="compareAtEuros"
              label={labels.compareAt}
              defaultValue={centsToEuros(product?.compareAtCents)}
            />
            <Input name="vatPercent" label={labels.vatPercent} type="number" defaultValue={product?.vatPercent ?? 21} />
            <Input name="priceLabel" label={labels.priceLabel} defaultValue={product?.priceLabel ?? ""} />
            {canChangePrice && (
              <Input
                name="costEuros"
                label={labels.costPrice}
                defaultValue={centsToEuros(product?.costCents)}
              />
            )}
            <label className="flex items-center gap-2 text-small mt-8">
              <input
                type="checkbox"
                name="priceIncludesVat"
                defaultChecked={product?.priceIncludesVat}
              />
              {labels.priceIncludesVat}
            </label>
          </fieldset>
          {billingWarn && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950">
              {billingWarn}
            </div>
          )}
          {priceMode !== "FIXED" && (
            <p className="text-small text-muted">{labels.onlyFixedEligible}</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">{labels.audienceHeading}</h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" name="audienceB2b" defaultChecked={product?.audienceB2b ?? true} />
              B2B
            </label>
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" name="audienceB2c" defaultChecked={product?.audienceB2c ?? false} />
              B2C
            </label>
          </div>
          <p className="text-small text-muted">{labels.audienceNote}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">{labels.contentHeading}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea name="benefits" label={labels.benefits} rows={5} defaultValue={(product?.benefits ?? []).join("\n")} />
            <Textarea name="includedItems" label={labels.includedItems} rows={5} defaultValue={(product?.includedItems ?? []).join("\n")} />
            <Textarea name="excludedItems" label={labels.excludedItems} rows={5} defaultValue={(product?.excludedItems ?? []).join("\n")} />
            <Textarea name="extensions" label={labels.extensions} rows={5} defaultValue={(product?.extensions ?? []).join("\n")} />
            <Textarea name="targetAudience" label={labels.targetAudience} rows={3} defaultValue={product?.targetAudience ?? ""} />
            <Textarea name="workflow" label={labels.workflow} rows={3} defaultValue={product?.workflow ?? ""} />
            <Input name="deliveryTime" label={labels.deliveryTime} defaultValue={product?.deliveryTime ?? ""} />
            <Textarea name="requiredInput" label={labels.requiredInput} rows={3} defaultValue={(product?.requiredInput ?? []).join("\n")} />
            <Input name="ctaLabel" label={labels.ctaLabel} defaultValue={product?.ctaLabel ?? ""} />
            <Input name="quoteCtaLabel" label={labels.quoteCtaLabel} defaultValue={product?.quoteCtaLabel ?? ""} />
            <Textarea name="warnings" label={labels.warnings} rows={3} defaultValue={product?.warnings ?? ""} />
            <Input name="seoTitle" label={labels.seoTitle} defaultValue={product?.seoTitle ?? ""} />
            <Textarea name="seoDescription" label={labels.seoDescription} rows={3} defaultValue={product?.seoDescription ?? ""} />
          </div>
        </section>

        <TranslationWorkflowPanel
          source={{
            name: product?.name ?? "",
            shortDescription: product?.shortDescription ?? "",
            fullDescription: product?.fullDescription ?? "",
            seoTitle: product?.seoTitle ?? "",
            seoDescription: product?.seoDescription ?? "",
            benefits: product?.benefits ?? [],
            includedItems: product?.includedItems ?? [],
            excludedItems: product?.excludedItems ?? [],
          }}
          translations={{ nl, en }}
          locales={locales}
          labels={translationLabels}
          canPublish={canPublish}
          productId={product?.id}
          previewHref={(locale) =>
            `/admin/products/${product?.id}/preview?locale=${locale}`
          }
        />

        <div className="flex flex-wrap gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t border-border">
          <Button type="submit" disabled={pending}>
            {mode === "create" ? labels.submitCreate : labels.submitEdit}
          </Button>
          <Link href="/admin/products" className="inline-flex items-center min-h-11 px-4 rounded-lg border border-border text-sm">
            {labels.cancel}
          </Link>
        </div>
      </form>

      {mode === "edit" && product && (
        <>
          <section className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold font-display">{labels.publicationHeading}</h2>
            <ul className="space-y-2 text-small">
              {checklist.map((item) => (
                <li
                  key={`${item.code}-${item.message}`}
                  className={
                    item.severity === "error"
                      ? "text-rose-800"
                      : item.severity === "warning"
                        ? "text-amber-900"
                        : "text-muted"
                  }
                >
                  [{item.severity}] {item.message}
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-surface-elevated px-3 py-2 text-small">
              <p className="font-medium mb-1">{labels.eligibilityHeading}</p>
              <ul className="space-y-1 text-muted">
                {blockReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            {canPublish && !legacyRemoved && (
              <div className="flex flex-wrap gap-2">
                {(["DRAFT", "REVIEW", "PUBLISHED", "HIDDEN"] as const).map((status) => (
                  <form
                    key={status}
                    action={(fd) => {
                      fd.set(
                        "payload",
                        JSON.stringify({
                          id: product.id,
                          expectedVersion: product.version ?? 1,
                          targetStatus: status,
                        }),
                      );
                      publishAction(fd);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" disabled={publishPending}>
                      {labels.setStatusTemplate.replace("{status}", status)}
                    </Button>
                  </form>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold font-display">{labels.partnerHeading}</h2>
            <p className="text-small text-muted">{labels.partnerNote}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-small mt-2">
                <input
                  type="checkbox"
                  name="partnerEnabled"
                  defaultChecked={product?.partnerEnabled ?? false}
                />
                {labels.partnerEnabled}
              </label>
              <label className="flex items-center gap-2 text-small mt-2">
                <input
                  type="checkbox"
                  name="partnerFeatured"
                  defaultChecked={product?.partnerFeatured ?? false}
                />
                {labels.partnerFeatured}
              </label>
              <label className="flex items-center gap-2 text-small mt-2">
                <input
                  type="checkbox"
                  name="partnerRequiresApproval"
                  defaultChecked={product?.partnerRequiresApproval ?? true}
                />
                {labels.partnerRequiresApproval}
              </label>
              <label className="space-y-1.5 text-small font-medium">
                {labels.partnerVisibility}
                <select
                  name="partnerVisibility"
                  defaultValue={product?.partnerVisibility ?? "none"}
                  className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                >
                  <option value="none">none</option>
                  <option value="all_active">all_active</option>
                  <option value="approval_required">approval_required</option>
                  <option value="selected_group">selected_group</option>
                  <option value="paused">paused</option>
                  <option value="campaign">campaign</option>
                  <option value="quote_only">quote_only</option>
                  <option value="requestable">requestable</option>
                </select>
              </label>
              <label className="space-y-1.5 text-small font-medium">
                {labels.partnerAvailability}
                <select
                  name="partnerAvailability"
                  defaultValue={product?.partnerAvailability ?? "available"}
                  className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                >
                  <option value="available">available</option>
                  <option value="limited">limited</option>
                  <option value="paused">paused</option>
                  <option value="out_of_stock">out_of_stock</option>
                </select>
              </label>
              <label className="space-y-1.5 text-small font-medium">
                {labels.commissionType}
                <select
                  name="partnerCommissionType"
                  defaultValue={product?.partnerCommissionType ?? "bps"}
                  className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                >
                  <option value="bps">{labels.commissionTypeBps}</option>
                  <option value="fixed_cents">fixed_cents</option>
                  <option value="tiered">tiered</option>
                  <option value="manual_quote">manual_quote</option>
                </select>
              </label>
              <Input
                name="partnerCommissionValue"
                label={labels.commissionValue}
                defaultValue={
                  product?.partnerCommissionValue != null
                    ? String(product.partnerCommissionValue)
                    : ""
                }
              />
              <Input
                name="partnerCommissionCurrency"
                label={labels.commissionCurrency}
                defaultValue={product?.partnerCommissionCurrency ?? "EUR"}
              />
              <label className="space-y-1.5 text-small font-medium">
                {labels.commissionStatus}
                <select
                  name="partnerCommissionStatus"
                  defaultValue={product?.partnerCommissionStatus ?? "draft"}
                  className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="retired">retired</option>
                </select>
              </label>
              <Input
                name="partnerMinimumPriceEuros"
                label={labels.partnerMinimumPrice}
                defaultValue={
                  product?.partnerMinimumPriceCents != null
                    ? (product.partnerMinimumPriceCents / 100).toFixed(2)
                    : ""
                }
              />
              <Input
                name="partnerMaximumDiscountBps"
                label={labels.partnerMaximumDiscount}
                defaultValue={
                  product?.partnerMaximumDiscountBps != null
                    ? String(product.partnerMaximumDiscountBps)
                    : ""
                }
              />
              <Input
                name="partnerPriority"
                label={labels.partnerPriority}
                type="number"
                defaultValue={String(product?.partnerPriority ?? 100)}
              />
              <div className="md:col-span-2">
                <Textarea
                  name="partnerSalesCopy"
                  label={labels.partnerSalesCopy}
                  rows={3}
                  defaultValue={product?.partnerSalesCopy ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  name="partnerTerms"
                  label={labels.partnerTerms}
                  rows={3}
                  defaultValue={product?.partnerTerms ?? ""}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold font-display">{labels.legalHeading}</h2>
            {legacyRemoved ? (
              <p className="text-small text-muted">
                {labels.legalBlockedLegacyTemplate.replace(
                  "{status}",
                  LEGACY_TAWK_ADMIN_STATUS_LABEL,
                )}
              </p>
            ) : !canLegal ? (
              <p className="text-small text-muted">{labels.legalNoPermission}</p>
            ) : (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  const payload = {
                    id: product.id,
                    expectedVersion: product.version ?? 1,
                    legalStatus: String(fd.get("legalStatus")),
                    priceStatus: String(fd.get("priceStatus")),
                    publicationReady: fd.get("publicationReady") === "on",
                    legalTermsVersion: String(fd.get("legalTermsVersion") ?? "") || null,
                    legalInternalNote: String(fd.get("legalInternalNote") ?? "") || null,
                  };
                  const out = new FormData();
                  out.set("payload", JSON.stringify(payload));
                  legalAction(out);
                }}
              >
                <label className="space-y-1.5 text-small font-medium">
                  {labels.legalStatus}
                  <select
                    name="legalStatus"
                    defaultValue={product.legalStatus ?? "NOT_REVIEWED"}
                    className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                  >
                    <option value="NOT_REVIEWED">NOT_REVIEWED</option>
                    <option value="INTERNAL_REVIEW">INTERNAL_REVIEW</option>
                    <option value="LEGAL_REVIEW_REQUIRED">LEGAL_REVIEW_REQUIRED</option>
                    <option value="APPROVED_FOR_B2B">APPROVED_FOR_B2B</option>
                    <option value="APPROVED_FOR_B2C">APPROVED_FOR_B2C</option>
                    <option value="APPROVED_FOR_BOTH">APPROVED_FOR_BOTH</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-small font-medium">
                  {labels.priceStatus}
                  <select
                    name="priceStatus"
                    defaultValue={product.priceStatus ?? "DRAFT"}
                    className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="INTERNAL_REVIEW">INTERNAL_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <Input
                  name="legalTermsVersion"
                  label={labels.legalTermsVersion}
                  defaultValue={product.legalTermsVersion ?? ""}
                />
                <label className="flex items-center gap-2 text-small mt-8">
                  <input
                    type="checkbox"
                    name="publicationReady"
                    defaultChecked={product.publicationReady ?? false}
                  />
                  {labels.publicationReady}
                </label>
                <div className="md:col-span-2">
                  <Textarea
                    name="legalInternalNote"
                    label={labels.legalInternalNote}
                    rows={3}
                    defaultValue={product.legalInternalNote ?? ""}
                  />
                </div>
                <p className="text-small text-muted md:col-span-2">
                  {labels.approvedByTemplate
                    .replace("{by}", product.legalApprovedBy ?? labels.empty)
                    .replace(
                      "{at}",
                      formatDateTime(
                        product.legalApprovedAt,
                        labels.locale,
                        labels.empty,
                      ),
                    )}
                </p>
                <Button type="submit" disabled={legalPending}>
                  {labels.saveLegal}
                </Button>
              </form>
            )}
          </section>

          {canArchive && (
            <section className="flex flex-wrap gap-2">
              {product.status !== "ARCHIVED" && !legacyRemoved ? (
                <form
                  action={async (formData) => {
                    await archiveProductAction({}, formData);
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="expectedVersion" value={product.version ?? 1} />
                  <Button type="submit" variant="outline">
                    {labels.archive}
                  </Button>
                </form>
              ) : null}
              {product.status === "ARCHIVED" && !legacyRemoved ? (
                <form
                  action={async (formData) => {
                    await restoreProductAction({}, formData);
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="expectedVersion" value={product.version ?? 1} />
                  <Button type="submit" variant="outline">
                    {labels.restoreFromArchive}
                  </Button>
                </form>
              ) : null}
              <form
                action={async (formData) => {
                  await deleteProductAction({}, formData);
                }}
                onSubmit={(e) => {
                  if (!window.confirm(labels.deleteConfirm)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={product.id} />
                <Button type="submit" variant="danger">
                  {labels.safeDelete}
                </Button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
