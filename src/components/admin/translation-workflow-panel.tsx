"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  computeTranslationSourceHash,
  getMissingTranslationFields,
  isTranslationSourceStale,
  type TranslationSourceInput,
} from "@/lib/commerce/product-locale-merge";
import { PRODUCT_TRANSLATION_STATUS_CODES } from "@/lib/portal/labels";
import type { TranslationPanelLabels } from "@/lib/admin/translation-panel-labels";
import type { Locale } from "@/i18n/config";
import type { ProductTranslation, ProductTranslationStatus } from "@/types";

interface Props {
  /** Canonical English copy from the `products` row — the source of truth. */
  source: TranslationSourceInput;
  translations: Partial<Record<Locale, ProductTranslation | undefined>>;
  /** Locales to edit, in display order. */
  locales: readonly Locale[];
  labels: TranslationPanelLabels;
  /** Actor holds `products.publish`; without it Published is not selectable. */
  canPublish: boolean;
  /** Absent in create mode — preview links need a persisted product. */
  productId?: string;
  previewHref?: (locale: Locale) => string;
}

function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

function lines(values: string[] | null | undefined): string {
  return (values ?? []).join("\n");
}

/** `Textarea` has no hint slot, so line-separated fields say it in the label. */
function perLine(label: string, hint: string): string {
  return `${label} (${hint.toLowerCase()})`;
}

/**
 * Read-only mirror of the English source next to the editable translation, so
 * a translator can see exactly what they are translating without leaving the
 * form or trusting a stale memory of the source.
 */
function SourceField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-small font-medium">{label}</p>
      <div
        className={`rounded-lg border border-border bg-surface-elevated px-3 py-2 text-small text-muted whitespace-pre-wrap ${
          multiline ? "max-h-40 overflow-y-auto" : "truncate"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function CompletenessHint({
  translation,
  labels,
}: {
  translation: Pick<
    ProductTranslation,
    "name" | "shortDescription" | "fullDescription" | "seoTitle" | "seoDescription" | "includedItems"
  >;
  labels: TranslationPanelLabels;
}) {
  const missing = getMissingTranslationFields(translation);

  if (missing.length === 0) {
    return <p className="text-small text-emerald-800">{labels.complete}</p>;
  }

  return (
    <p className="text-small text-amber-800">
      {fill(labels.missingTemplate, {
        fields: missing.map((f) => labels.missingFields[f] ?? f).join(", "),
      })}
    </p>
  );
}

export function TranslationWorkflowPanel({
  source,
  translations,
  locales,
  labels,
  canPublish,
  productId,
  previewHref,
}: Props) {
  const currentSourceHash = computeTranslationSourceHash(source);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold font-display">{labels.sectionTitle}</h2>

      {locales.map((locale) => {
        const row = translations[locale];
        const localeLabels = labels.perLocale[locale];
        const status: ProductTranslationStatus = row?.status ?? "draft";
        const stale = isTranslationSourceStale(row?.sourceHash, currentSourceHash);

        // English rows fall back to the canonical product copy, which is what
        // upsertTranslations() would persist for them anyway.
        const isSourceLocale = locale === "en";
        const defaults = {
          name: row?.name ?? (isSourceLocale ? (source.name ?? "") : ""),
          shortDescription:
            row?.shortDescription ?? (isSourceLocale ? (source.shortDescription ?? "") : ""),
          fullDescription:
            row?.fullDescription ?? (isSourceLocale ? (source.fullDescription ?? "") : ""),
          benefits: lines(row?.benefits ?? (isSourceLocale ? source.benefits : [])),
          includedItems: lines(row?.includedItems ?? (isSourceLocale ? source.includedItems : [])),
          excludedItems: lines(row?.excludedItems ?? (isSourceLocale ? source.excludedItems : [])),
          ctaLabel: row?.ctaLabel ?? "",
          quoteCtaLabel: row?.quoteCtaLabel ?? "",
          seoTitle: row?.seoTitle ?? (isSourceLocale ? (source.seoTitle ?? "") : ""),
          seoDescription:
            row?.seoDescription ?? (isSourceLocale ? (source.seoDescription ?? "") : ""),
        };

        return (
          <div
            key={locale}
            className="space-y-4 rounded-lg border border-border p-4"
            data-testid={`translation-panel-${locale}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{localeLabels.heading}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-3 py-1 text-xs">
                  {labels.statusShort[status] ?? status}
                </span>
                {stale && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900">
                    {labels.staleBadge}
                  </span>
                )}
                {productId && previewHref && (
                  <Link
                    href={previewHref(locale)}
                    className="text-xs text-primary hover:underline"
                  >
                    {localeLabels.previewLink}
                  </Link>
                )}
              </div>
            </div>

            {stale && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950"
                role="status"
              >
                <p className="font-medium">{labels.staleTitle}</p>
                <p className="mt-1">{labels.staleDescription}</p>
              </div>
            )}

            {!row?.name && <p className="text-small text-amber-800">{localeLabels.incomplete}</p>}

            <label className="space-y-1.5 text-small font-medium block">
              {localeLabels.statusLabel}
              <select
                name={`${locale}_status`}
                defaultValue={status}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                {PRODUCT_TRANSLATION_STATUS_CODES.map((code) => (
                  <option
                    key={code}
                    value={code}
                    // Informational only — the enforced gate is server-side in
                    // canTransitionTranslationStatus()/upsertTranslations().
                    disabled={code === "published" && !canPublish}
                  >
                    {labels.status[code] ?? code}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-small text-muted">{labels.gateHint}</p>
            {!canPublish && (
              <p className="text-small text-muted">{labels.noPublishCapability}</p>
            )}

            <CompletenessHint
              translation={{
                name: defaults.name,
                shortDescription: defaults.shortDescription,
                fullDescription: defaults.fullDescription,
                seoTitle: defaults.seoTitle,
                seoDescription: defaults.seoDescription,
                includedItems: defaults.includedItems ? defaults.includedItems.split("\n") : [],
              }}
              labels={labels}
            />

            <p className="text-small text-muted">
              {row?.reviewedAt
                ? fill(labels.reviewedAtTemplate, {
                    date: new Date(row.reviewedAt).toISOString().slice(0, 10),
                  })
                : labels.neverReviewed}
              {row?.publishedAt
                ? ` · ${fill(labels.publishedAtTemplate, {
                    date: new Date(row.publishedAt).toISOString().slice(0, 10),
                  })}`
                : ""}
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-small">{labels.sourceHeading}</h4>
                  <p className="text-small text-muted">{labels.sourceHint}</p>
                </div>
                <SourceField label={labels.fields.name!} value={source.name ?? ""} />
                <SourceField
                  label={labels.fields.shortDescription!}
                  value={source.shortDescription ?? ""}
                  multiline
                />
                <SourceField
                  label={labels.fields.fullDescription!}
                  value={source.fullDescription ?? ""}
                  multiline
                />
                <SourceField
                  label={labels.fields.benefits!}
                  value={lines(source.benefits)}
                  multiline
                />
                <SourceField
                  label={labels.fields.includedItems!}
                  value={lines(source.includedItems)}
                  multiline
                />
                <SourceField
                  label={labels.fields.excludedItems!}
                  value={lines(source.excludedItems)}
                  multiline
                />
                <SourceField label={labels.fields.seoTitle!} value={source.seoTitle ?? ""} />
                <SourceField
                  label={labels.fields.seoDescription!}
                  value={source.seoDescription ?? ""}
                  multiline
                />
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-small">{localeLabels.heading}</h4>
                <Input
                  name={`${locale}_name`}
                  label={labels.fields.name!}
                  defaultValue={defaults.name}
                />
                <Textarea
                  name={`${locale}_shortDescription`}
                  label={labels.fields.shortDescription!}
                  rows={2}
                  defaultValue={defaults.shortDescription}
                />
                <Textarea
                  name={`${locale}_fullDescription`}
                  label={labels.fields.fullDescription!}
                  rows={4}
                  defaultValue={defaults.fullDescription}
                />
                <Textarea
                  name={`${locale}_benefits`}
                  label={perLine(labels.fields.benefits!, labels.linesHint)}
                  rows={3}
                  defaultValue={defaults.benefits}
                />
                <Textarea
                  name={`${locale}_includedItems`}
                  label={perLine(labels.fields.includedItems!, labels.linesHint)}
                  rows={3}
                  defaultValue={defaults.includedItems}
                />
                <Textarea
                  name={`${locale}_excludedItems`}
                  label={perLine(labels.fields.excludedItems!, labels.linesHint)}
                  rows={2}
                  defaultValue={defaults.excludedItems}
                />
                <Input
                  name={`${locale}_ctaLabel`}
                  label={labels.fields.ctaLabel!}
                  defaultValue={defaults.ctaLabel}
                />
                <Input
                  name={`${locale}_quoteCtaLabel`}
                  label={labels.fields.quoteCtaLabel!}
                  defaultValue={defaults.quoteCtaLabel}
                />
                <Input
                  name={`${locale}_seoTitle`}
                  label={labels.fields.seoTitle!}
                  defaultValue={defaults.seoTitle}
                />
                <Textarea
                  name={`${locale}_seoDescription`}
                  label={labels.fields.seoDescription!}
                  rows={2}
                  defaultValue={defaults.seoDescription}
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
