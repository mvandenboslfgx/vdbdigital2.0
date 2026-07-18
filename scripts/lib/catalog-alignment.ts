/**
 * Pure dual-catalog alignment helpers (no side effects).
 */
import { commercialCatalog } from "../../src/config/commercial/pricing";
import {
  canPublishForB2b,
  canPublishForB2c,
} from "../../src/config/commercial/pricing";
import {
  resolvePriceMode,
  isRecurringBilling,
} from "../../src/lib/commerce/checkout-eligibility";
import type { Product } from "../../src/types";

export type AlignmentClass =
  | "MATCHED"
  | "MISSING_COMMERCIAL_MAPPING"
  | "MISSING_SHOP_PRODUCT"
  | "DUPLICATE_SKU"
  | "DUPLICATE_SLUG"
  | "LEGAL_STATUS_MISMATCH"
  | "PRICE_MODE_MISMATCH"
  | "BILLING_MODEL_MISMATCH";

export type AlignmentRow = {
  classification: AlignmentClass;
  shopSlug?: string;
  commercialSlug?: string;
  detail: string;
};

export function runAlignmentReport(shop: Product[]): {
  rows: AlignmentRow[];
  blockers: AlignmentRow[];
} {
  const rows: AlignmentRow[] = [];
  const slugCounts = new Map<string, number>();
  for (const p of shop) {
    slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      rows.push({
        classification: "DUPLICATE_SLUG",
        shopSlug: slug,
        detail: `slug appears ${count} times in shop catalog`,
      });
    }
  }

  const skuCounts = new Map<string, number>();
  for (const p of shop) {
    if (!p.internalSku) continue;
    skuCounts.set(p.internalSku, (skuCounts.get(p.internalSku) ?? 0) + 1);
  }
  for (const [skuKey, count] of skuCounts) {
    if (count > 1) {
      rows.push({
        classification: "DUPLICATE_SKU",
        detail: `SKU ${skuKey} appears ${count} times`,
      });
    }
  }

  const commercialBySlug = new Map(commercialCatalog.map((c) => [c.slug, c]));
  const shopBySlug = new Map(shop.map((p) => [p.slug, p]));

  for (const p of shop) {
    const commercial = commercialBySlug.get(p.slug);
    if (!commercial) {
      rows.push({
        classification: "MISSING_COMMERCIAL_MAPPING",
        shopSlug: p.slug,
        detail: "shop product has no commercial catalog entry by slug",
      });
      continue;
    }

    const shopMode = resolvePriceMode(p);
    const commercialMode =
      commercial.quoteOnly || !commercial.pricing
        ? "QUOTE_ONLY"
        : commercial.pricing.mode === "fixed"
          ? "FIXED"
          : commercial.pricing.mode === "starting_from"
            ? "STARTING_FROM"
            : "QUOTE_ONLY";

    if (shopMode !== commercialMode) {
      rows.push({
        classification: "PRICE_MODE_MISMATCH",
        shopSlug: p.slug,
        commercialSlug: commercial.slug,
        detail: `shop=${shopMode} commercial=${commercialMode}`,
      });
    }

    if (commercial.monthly && !isRecurringBilling(p.billingType)) {
      rows.push({
        classification: "BILLING_MODEL_MISMATCH",
        shopSlug: p.slug,
        commercialSlug: commercial.slug,
        detail: `shop billing=${p.billingType} commercial.monthly=${commercial.monthly}`,
      });
    }

    if (
      p.status === "PUBLISHED" &&
      !canPublishForB2b(commercial) &&
      !canPublishForB2c(commercial)
    ) {
      rows.push({
        classification: "LEGAL_STATUS_MISMATCH",
        shopSlug: p.slug,
        commercialSlug: commercial.slug,
        detail: `published shop product without B2B/B2C legal publish readiness (legal=${commercial.legalStatus})`,
      });
    }

    rows.push({
      classification: "MATCHED",
      shopSlug: p.slug,
      commercialSlug: commercial.slug,
      detail: `mode=${shopMode} legal=${commercial.legalStatus}`,
    });
  }

  for (const c of commercialCatalog) {
    if (!shopBySlug.has(c.slug)) {
      rows.push({
        classification: "MISSING_SHOP_PRODUCT",
        commercialSlug: c.slug,
        detail: "commercial package has no shop product with same slug",
      });
    }
  }

  const blockers = rows.filter((r) =>
    [
      "DUPLICATE_SKU",
      "DUPLICATE_SLUG",
      "MISSING_COMMERCIAL_MAPPING",
      "LEGAL_STATUS_MISMATCH",
      "PRICE_MODE_MISMATCH",
      "BILLING_MODEL_MISMATCH",
    ].includes(r.classification),
  );

  return { rows, blockers };
}
