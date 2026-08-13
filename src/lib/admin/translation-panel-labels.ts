import type { TranslateFn } from "@/i18n/create-t";
import { locales, type Locale } from "@/i18n/config";
import {
  PRODUCT_TRANSLATION_STATUS_CODES,
  TRANSLATION_FIELD_KEYS,
  TRANSLATION_STATUS_KEYS,
  TRANSLATION_STATUS_SHORT_KEYS,
  labelFor,
} from "@/lib/portal/labels";

/**
 * The translation workflow panel is a client component, so every string it
 * renders has to be resolved on the server first. Building them here (rather
 * than inline in the page) keeps the panel free of dictionary lookups and
 * makes the exact key set testable.
 */
export interface TranslationPanelLabels {
  sectionTitle: string;
  sourceHeading: string;
  sourceHint: string;
  gateHint: string;
  noPublishCapability: string;
  complete: string;
  /** `{fields}` placeholder is substituted client-side. */
  missingTemplate: string;
  staleTitle: string;
  staleDescription: string;
  staleBadge: string;
  neverReviewed: string;
  /** `{date}` placeholder is substituted client-side. */
  reviewedAtTemplate: string;
  publishedAtTemplate: string;
  linesHint: string;
  /** Long-form status option labels, keyed by DB enum code. */
  status: Record<string, string>;
  /** Badge-sized status labels, keyed by DB enum code. */
  statusShort: Record<string, string>;
  /** Form field labels, keyed by translation field name. */
  fields: Record<string, string>;
  /** Inline missing-field names, keyed by translation field name. */
  missingFields: Record<string, string>;
  /** Per-locale copy that embeds the locale's display name. */
  perLocale: Record<
    Locale,
    {
      displayName: string;
      heading: string;
      statusLabel: string;
      incomplete: string;
      previewLink: string;
    }
  >;
}

/**
 * Endonyms: a language option is labelled in its own language so it stays
 * recognisable whichever locale the admin UI is currently rendered in.
 */
const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
};

export function buildTranslationPanelLabels(t: TranslateFn): TranslationPanelLabels {
  const status: Record<string, string> = {};
  const statusShort: Record<string, string> = {};
  for (const code of PRODUCT_TRANSLATION_STATUS_CODES) {
    status[code] = labelFor(t, TRANSLATION_STATUS_KEYS, code);
    statusShort[code] = labelFor(t, TRANSLATION_STATUS_SHORT_KEYS, code);
  }

  const fieldNames = [
    "name",
    "shortDescription",
    "fullDescription",
    "benefits",
    "includedItems",
    "excludedItems",
    "ctaLabel",
    "quoteCtaLabel",
    "seoTitle",
    "seoDescription",
  ] as const;

  const fields: Record<string, string> = {};
  for (const field of fieldNames) {
    fields[field] = t(`admin.translation.fields.${field}`);
  }

  const missingFields: Record<string, string> = {};
  for (const [code, key] of Object.entries(TRANSLATION_FIELD_KEYS)) {
    missingFields[code] = t(key);
  }

  const perLocale = Object.fromEntries(
    locales.map((locale) => {
      const displayName = LOCALE_DISPLAY_NAMES[locale];
      return [
        locale,
        {
          displayName,
          heading: t("admin.translation.translatedHeading", { locale: displayName }),
          statusLabel: t("admin.translation.statusLabel", { locale: displayName }),
          incomplete: t("admin.translation.incomplete", { locale: displayName }),
          previewLink: t("admin.translation.previewLink", { locale: displayName }),
        },
      ];
    }),
  ) as TranslationPanelLabels["perLocale"];

  return {
    sectionTitle: t("admin.translation.sectionTitle"),
    sourceHeading: t("admin.translation.sourceHeading"),
    sourceHint: t("admin.translation.sourceHint"),
    gateHint: t("admin.translation.gateHint"),
    noPublishCapability: t("admin.translation.noPublishCapability"),
    complete: t("admin.translation.complete"),
    missingTemplate: t("admin.translation.missing"),
    staleTitle: t("admin.translation.staleTitle"),
    staleDescription: t("admin.translation.staleDescription"),
    staleBadge: t("admin.translation.staleBadge"),
    neverReviewed: t("admin.translation.neverReviewed"),
    reviewedAtTemplate: t("admin.translation.reviewedAt"),
    publishedAtTemplate: t("admin.translation.publishedAt"),
    linesHint: t("admin.translation.linesHint"),
    status,
    statusShort,
    fields,
    missingFields,
    perLocale,
  };
}
