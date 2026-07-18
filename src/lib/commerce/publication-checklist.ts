import type { Product } from "@/types";
import {
  assertProductTranslationComplete,
} from "@/i18n/localize-product";
import {
  getCheckoutBlockLabelsNl,
  resolveStoredOrDerivedPriceMode,
  billingWarningNl,
} from "@/lib/commerce/catalog-admin-eligibility";
import { canPublishForB2b, canPublishForB2c } from "@/config/commercial/pricing";
import { resolveCommercialItemForProduct } from "@/lib/commerce/catalog-admin-eligibility";
import { isDirectCheckoutEnabled } from "@/config/features";

export interface PublicationCheckItem {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export function buildPublicationChecklist(product: Product): PublicationCheckItem[] {
  const items: PublicationCheckItem[] = [];

  if (!product.name?.trim()) {
    items.push({ code: "NAME", severity: "error", message: "Productnaam ontbreekt" });
  }
  if (!product.shortDescription?.trim()) {
    items.push({
      code: "SHORT",
      severity: "error",
      message: "Korte omschrijving ontbreekt",
    });
  }
  if (!product.fullDescription?.trim()) {
    items.push({
      code: "FULL",
      severity: "error",
      message: "Volledige omschrijving ontbreekt",
    });
  }
  if (!product.categoryId && !product.categorySlug) {
    items.push({ code: "CATEGORY", severity: "warning", message: "Categorie ontbreekt" });
  }

  const mode = resolveStoredOrDerivedPriceMode(product);
  if (mode === "FIXED" && (product.priceCents === null || product.priceCents <= 0)) {
    items.push({
      code: "PRICE",
      severity: "error",
      message: "Ontbrekende of ongeldige vaste prijs",
    });
  }
  if (mode === "STARTING_FROM") {
    items.push({
      code: "PRICE_MODE",
      severity: "info",
      message: "Prijstype STARTING_FROM — alleen als offerte-/marketingproduct publiceerbaar",
    });
  }
  if (mode === "QUOTE_ONLY") {
    items.push({
      code: "QUOTE",
      severity: "info",
      message: "Alleen offerte — geen directe checkout",
    });
  }

  const billingWarn = billingWarningNl(product.billingType);
  if (billingWarn) {
    items.push({ code: "BILLING", severity: "warning", message: billingWarn });
  }

  const en = assertProductTranslationComplete(product, "en");
  if (!en.complete) {
    items.push({
      code: "EN",
      severity: "warning",
      message: `Engelse vertaling incompleet: ${en.missing.join(", ")}`,
    });
  }
  const nl = assertProductTranslationComplete(product, "nl");
  if (!nl.complete) {
    items.push({
      code: "NL",
      severity: "warning",
      message: `Nederlandse vertaling incompleet: ${nl.missing.join(", ")}`,
    });
  }

  if (!product.primaryImagePath && (!product.media || product.media.length === 0)) {
    items.push({
      code: "IMAGE",
      severity: "warning",
      message: "Geen productafbeelding",
    });
  }

  if (!product.seoTitle?.trim() || !product.seoDescription?.trim()) {
    items.push({
      code: "SEO",
      severity: "warning",
      message: "SEO-titel of metaomschrijving ontbreekt",
    });
  }

  const commercial = resolveCommercialItemForProduct(product);
  if (!commercial) {
    items.push({
      code: "COMMERCIAL",
      severity: "warning",
      message: "Geen commercieel goedkeuringsrecord — juridische publicatie niet bevestigd",
    });
  } else {
    items.push({
      code: "B2B_LEGAL",
      severity: canPublishForB2b(commercial) ? "info" : "warning",
      message: canPublishForB2b(commercial)
        ? "B2B juridisch toegestaan"
        : "B2B-goedkeuring ontbreekt of niet publicatieklaar",
    });
    items.push({
      code: "B2C_LEGAL",
      severity: canPublishForB2c(commercial) ? "info" : "warning",
      message: canPublishForB2c(commercial)
        ? "B2C juridisch toegestaan"
        : "B2C-goedkeuring ontbreekt of niet publicatieklaar",
    });
  }

  if (!isDirectCheckoutEnabled()) {
    items.push({
      code: "CHECKOUT_FLAG",
      severity: "info",
      message: "Directe checkout is momenteel algemeen uitgeschakeld",
    });
  }

  for (const label of getCheckoutBlockLabelsNl(product, "B2B")) {
    items.push({
      code: "ELIGIBILITY",
      severity: "info",
      message: label,
    });
  }

  return items;
}

export function canPublishAsMarketing(product: Product): boolean {
  return Boolean(
    product.name?.trim() &&
      product.shortDescription?.trim() &&
      product.fullDescription?.trim(),
  );
}

export function publicationBlockingErrors(product: Product): PublicationCheckItem[] {
  return buildPublicationChecklist(product).filter((i) => i.severity === "error");
}
