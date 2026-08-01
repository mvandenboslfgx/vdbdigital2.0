import type { TranslateFn } from "@/i18n/create-t";

/**
 * Display labels for portal/admin domain enums.
 *
 * The DB enum codes (`DRAFT`, `WAITING_FOR_CUSTOMER`, …) are the stable
 * contract and are never translated — only their presentation is. Each map
 * below is `code → translation key` under `portal.status.*`, so the same code
 * renders per-locale copy via `t()` while filters and form values keep sending
 * the raw code.
 */
export type LabelKeyMap = Record<string, string>;

function keyMap(namespace: string, codes: readonly string[]): LabelKeyMap {
  return Object.fromEntries(codes.map((code) => [code, `${namespace}.${code}`]));
}

export const PROJECT_STATUS_CODES = [
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "REVIEW",
  "IN_REVIEW",
  "COMPLETED",
  "ON_HOLD",
  "CANCELED",
  "ARCHIVED",
] as const;

export const PROJECT_TYPE_CODES = [
  "WEBSITE",
  "WEBSHOP",
  "SOFTWARE",
  "OPTIMISATION",
  "MAINTENANCE",
  "BRANDING",
  "INTEGRATION",
  "SUPPORT",
  "OTHER",
] as const;

export const MILESTONE_STATUS_CODES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "COMPLETED",
  "SKIPPED",
] as const;

export const ACTION_STATUS_CODES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELED",
] as const;

export const DELIVERABLE_STATUS_CODES = [
  "DRAFT",
  "IN_REVIEW",
  "PENDING",
  "SHARED",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
] as const;

export const QUOTE_STATUS_CODES = [
  "DRAFT",
  "IN_REVIEW",
  "READY",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
  "SUPERSEDED",
  "ARCHIVED",
] as const;

export const INVOICE_STATUS_CODES = [
  "DRAFT",
  "IN_REVIEW",
  "READY",
  "ISSUED",
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELED",
  "CREDITED",
  "ARCHIVED",
] as const;

export const INVOICE_TYPE_CODES = ["INVOICE", "CREDIT_NOTE", "PROFORMA"] as const;

export const TICKET_STATUS_CODES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_VDB",
  "RESOLVED",
  "CLOSED",
] as const;

export const DOCUMENT_STATUS_CODES = [
  "UPLOADING",
  "AVAILABLE",
  "QUARANTINED",
  "REJECTED",
  "ARCHIVED",
  "DELETED",
] as const;

export const DOCUMENT_VISIBILITY_CODES = [
  "INTERNAL",
  "CUSTOMER_VISIBLE",
  "CUSTOMER_UPLOAD",
  "RESTRICTED",
] as const;

export const DOCUMENT_CATEGORY_CODES = [
  "GENERAL",
  "PROJECT_FILE",
  "DELIVERABLE",
  "QUOTE",
  "INVOICE",
  "CONTRACT",
  "BRIEFING",
  "DESIGN",
  "CONTENT",
  "REPORT",
  "SUPPORT_ATTACHMENT",
  "OTHER",
] as const;

/** product_translations.status — DB enum, display-only translation. */
export const PRODUCT_TRANSLATION_STATUS_CODES = [
  "draft",
  "machine_translated",
  "needs_review",
  "approved",
  "published",
  "stale",
] as const;

/** Required copy fields reported by getMissingTranslationFields(). */
export const TRANSLATION_FIELD_CODES = [
  "name",
  "shortDescription",
  "fullDescription",
  "seoTitle",
  "seoDescription",
  "includedItems",
] as const;

/** Catalogue enums used by the admin products surfaces. */
export const PRODUCT_STATUS_CODES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "HIDDEN",
  "ARCHIVED",
] as const;

export const PRICE_MODE_CODES = [
  "FIXED",
  "STARTING_FROM",
  "QUOTE_ONLY",
] as const;

export const BILLING_TYPE_CODES = [
  "ONE_TIME",
  "MONTHLY",
  "YEARLY",
  "QUOTE_ONLY",
] as const;

/** Mirrors PROJECT_PRIORITIES in src/lib/validation/projects.ts. */
export const PROJECT_PRIORITY_CODES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

/** portal_invoice_payment_method — manual registration only, no provider. */
export const PAYMENT_METHOD_CODES = [
  "BANK_TRANSFER",
  "CASH",
  "CARD_EXTERNAL",
  "ACCOUNTING_IMPORT",
  "OTHER",
] as const;

export const SCAN_STATUS_CODES = [
  "NOT_REQUIRED",
  "PENDING",
  "CLEAN",
  "SUSPICIOUS",
  "INFECTED",
  "FAILED",
] as const;

export const PROJECT_STATUS_KEYS = keyMap(
  "portal.status.project",
  PROJECT_STATUS_CODES,
);
export const PROJECT_TYPE_KEYS = keyMap(
  "portal.status.projectType",
  PROJECT_TYPE_CODES,
);
export const MILESTONE_STATUS_KEYS = keyMap(
  "portal.status.milestone",
  MILESTONE_STATUS_CODES,
);
export const ACTION_STATUS_KEYS = keyMap(
  "portal.status.action",
  ACTION_STATUS_CODES,
);
export const DELIVERABLE_STATUS_KEYS = keyMap(
  "portal.status.deliverable",
  DELIVERABLE_STATUS_CODES,
);
export const QUOTE_STATUS_KEYS = keyMap(
  "portal.status.quote",
  QUOTE_STATUS_CODES,
);
export const INVOICE_STATUS_KEYS = keyMap(
  "portal.status.invoice",
  INVOICE_STATUS_CODES,
);
export const INVOICE_TYPE_KEYS = keyMap(
  "portal.status.invoiceType",
  INVOICE_TYPE_CODES,
);
export const TICKET_STATUS_KEYS = keyMap(
  "portal.status.ticket",
  TICKET_STATUS_CODES,
);
export const DOCUMENT_STATUS_KEYS = keyMap(
  "portal.status.document",
  DOCUMENT_STATUS_CODES,
);
export const DOCUMENT_VISIBILITY_KEYS = keyMap(
  "portal.status.documentVisibility",
  DOCUMENT_VISIBILITY_CODES,
);
export const DOCUMENT_CATEGORY_KEYS = keyMap(
  "portal.status.documentCategory",
  DOCUMENT_CATEGORY_CODES,
);
export const SCAN_STATUS_KEYS = keyMap("portal.status.scan", SCAN_STATUS_CODES);
export const PAYMENT_METHOD_KEYS = keyMap(
  "admin.paymentMethod",
  PAYMENT_METHOD_CODES,
);
export const PROJECT_PRIORITY_KEYS = keyMap(
  "admin.page.projects.priority",
  PROJECT_PRIORITY_CODES,
);
export const PRODUCT_STATUS_KEYS = keyMap(
  "admin.catalog.productStatus",
  PRODUCT_STATUS_CODES,
);
export const PRICE_MODE_KEYS = keyMap(
  "admin.catalog.priceMode",
  PRICE_MODE_CODES,
);
export const BILLING_TYPE_KEYS = keyMap(
  "admin.catalog.billingType",
  BILLING_TYPE_CODES,
);
/** Long-form option labels (include the "not visible"/"live" consequence). */
export const TRANSLATION_STATUS_KEYS = keyMap(
  "admin.translation.status",
  PRODUCT_TRANSLATION_STATUS_CODES,
);
/** Badge-sized labels for the same codes. */
export const TRANSLATION_STATUS_SHORT_KEYS = keyMap(
  "admin.translation.statusShort",
  PRODUCT_TRANSLATION_STATUS_CODES,
);
export const TRANSLATION_FIELD_KEYS = keyMap(
  "admin.translation.missingFields",
  TRANSLATION_FIELD_CODES,
);

/**
 * Translate an enum code. Unknown codes and missing translations fall back to
 * the raw code so a schema change surfaces as `WAITING_FOR_LEGAL` rather than a
 * dotted translation key leaking into the UI.
 */
export function labelFor(
  t: TranslateFn,
  keys: LabelKeyMap,
  value: string | null | undefined,
): string {
  if (!value) return "";
  const key = keys[value];
  if (!key) return value;
  const translated = t(key);
  return translated === key ? value : translated;
}

/** Ordered `{ value, label }` pairs for filter and form selects. */
export function labelOptions(
  t: TranslateFn,
  keys: LabelKeyMap,
): { value: string; label: string }[] {
  return Object.keys(keys).map((code) => ({
    value: code,
    label: labelFor(t, keys, code),
  }));
}

/** Flatten a key map into resolved copy for passing into client components. */
export function resolveLabelMap(
  t: TranslateFn,
  keys: LabelKeyMap,
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(keys).map((code) => [code, labelFor(t, keys, code)]),
  );
}
