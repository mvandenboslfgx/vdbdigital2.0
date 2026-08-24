export type FulfillmentType =
  | "DIGITAL_LICENSE"
  | "SUBSCRIPTION"
  | "WEBSITE_PROJECT"
  | "SERVICE"
  | "DOWNLOAD"
  | "MANUAL_REVIEW"
  | "QUOTE_REQUIRED";

const FULFILLMENT_TYPES = new Set<FulfillmentType>([
  "DIGITAL_LICENSE",
  "SUBSCRIPTION",
  "WEBSITE_PROJECT",
  "SERVICE",
  "DOWNLOAD",
  "MANUAL_REVIEW",
  "QUOTE_REQUIRED",
]);

export function asFulfillmentType(value: string | null | undefined): FulfillmentType | null {
  if (!value) return null;
  const normalized = value.toUpperCase() as FulfillmentType;
  return FULFILLMENT_TYPES.has(normalized) ? normalized : null;
}

export function inferFulfillmentType(
  productSlug: string | null | undefined,
  explicit?: FulfillmentType | null,
): FulfillmentType {
  if (explicit) return explicit;
  const slug = (productSlug ?? "").toLowerCase();
  if (slug.includes("custom") || slug.includes("quote")) return "QUOTE_REQUIRED";
  if (
    slug.includes("website") ||
    slug.includes("webshop") ||
    slug.includes("onepage") ||
    slug.includes("catalog-probe")
  ) {
    return "WEBSITE_PROJECT";
  }
  if (slug.includes("license") || slug.includes("software")) return "DIGITAL_LICENSE";
  if (slug.includes("download")) return "DOWNLOAD";
  if (slug.includes("service") || slug.includes("support")) return "SERVICE";
  if (slug.includes("care") || slug.includes("subscription") || slug.includes("jaar")) {
    return "SUBSCRIPTION";
  }
  return "MANUAL_REVIEW";
}
