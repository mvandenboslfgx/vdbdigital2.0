import { z } from "zod";

const slugSchema = z
  .string()
  .min(2, "Slug is verplicht")
  .max(120, "Slug is te lang")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug mag alleen kleine letters, cijfers en koppeltekens bevatten");

const centsSchema = z
  .number({ error: "Bedrag moet een geheel getal in centen zijn" })
  .int("Bedrag moet een geheel getal in centen zijn")
  .min(0, "Bedrag mag niet negatief zijn")
  .nullable();

export const priceModeSchema = z.enum(["FIXED", "STARTING_FROM", "QUOTE_ONLY"]);
export const billingTypeSchema = z.enum([
  "ONE_TIME",
  "MONTHLY",
  "YEARLY",
  "QUOTE_ONLY",
  "FREE",
]);
export const productStatusSchema = z.enum([
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "HIDDEN",
  "ARCHIVED",
]);

export const productTranslationSchema = z.object({
  locale: z.enum(["nl", "en"]),
  name: z.string().max(200),
  slug: z.string().max(120).nullable().optional(),
  shortDescription: z.string().max(2000),
  fullDescription: z.string().max(50000),
  benefits: z.array(z.string().max(500)).max(50).default([]),
  includedItems: z.array(z.string().max(500)).max(100).default([]),
  excludedItems: z.array(z.string().max(500)).max(100).default([]),
  ctaLabel: z.string().max(120).nullable().optional(),
  quoteCtaLabel: z.string().max(120).nullable().optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  deliveryTime: z.string().max(200).nullable().optional(),
  targetAudience: z.string().max(2000).nullable().optional(),
  workflow: z.string().max(5000).nullable().optional(),
  warnings: z.string().max(5000).nullable().optional(),
});

export const productContentSchema = z.object({
  name: z.string().min(2, "Productnaam is verplicht").max(200),
  slug: slugSchema,
  internalSku: z.string().max(64).nullable().optional(),
  shortDescription: z.string().min(1, "Korte omschrijving is verplicht").max(2000),
  fullDescription: z.string().min(1, "Volledige omschrijving is verplicht").max(50000),
  categoryId: z.string().uuid("Ongeldige categorie").nullable().optional(),
  badge: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(40)).max(30).default([]),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  featured: z.boolean().default(false),
  deliveryTime: z.string().max(200).default(""),
  includedItems: z.array(z.string().max(500)).max(100).default([]),
  excludedItems: z.array(z.string().max(500)).max(100).default([]),
  extensions: z.array(z.string().max(500)).max(100).default([]),
  benefits: z.array(z.string().max(500)).max(50).default([]),
  targetAudience: z.string().max(2000).optional(),
  workflow: z.string().max(5000).optional(),
  requiredInput: z.array(z.string().max(500)).max(50).default([]),
  ctaLabel: z.string().max(120).nullable().optional(),
  quoteCtaLabel: z.string().max(120).nullable().optional(),
  warnings: z.string().max(5000).nullable().optional(),
  seoTitle: z.string().max(200).default(""),
  seoDescription: z.string().max(500).default(""),
  audienceB2b: z.boolean().default(true),
  audienceB2c: z.boolean().default(false),
  translations: z.array(productTranslationSchema).max(2).optional(),
  partnerEnabled: z.boolean().optional(),
  partnerVisibility: z
    .enum([
      "none",
      "all_active",
      "approval_required",
      "selected_group",
      "paused",
      "campaign",
      "quote_only",
      "requestable",
    ])
    .optional(),
  partnerCommissionType: z
    .enum(["bps", "fixed_cents", "tiered", "manual_quote"])
    .optional(),
  partnerCommissionValue: z.number().nullable().optional(),
  partnerCommissionCurrency: z.string().max(8).optional(),
  partnerCommissionStatus: z
    .enum(["draft", "active", "paused", "retired"])
    .optional(),
  partnerMinimumPriceCents: z.number().int().min(0).nullable().optional(),
  partnerMaximumDiscountBps: z.number().int().min(0).max(10000).nullable().optional(),
  partnerRequiresApproval: z.boolean().optional(),
  partnerTerms: z.string().max(10000).nullable().optional(),
  partnerSalesCopy: z.string().max(5000).nullable().optional(),
  partnerAvailability: z
    .enum(["available", "limited", "paused", "out_of_stock"])
    .optional(),
  partnerPriority: z.number().int().min(0).max(99999).optional(),
  partnerFeatured: z.boolean().optional(),
});

export const productPricingSchema = z
  .object({
    priceMode: priceModeSchema,
    billingType: billingTypeSchema,
    priceCents: centsSchema,
    fromPriceCents: centsSchema,
    compareAtCents: centsSchema.optional(),
    currency: z.literal("EUR").default("EUR"),
    vatPercent: z.number().int().min(0).max(100).default(21),
    priceIncludesVat: z.boolean().default(false),
    priceLabel: z.string().max(80).nullable().optional(),
    costCents: centsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.priceMode === "FIXED") {
      if (data.priceCents === null || data.priceCents <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Vaste prijs vereist een geldig bedrag groter dan 0",
          path: ["priceCents"],
        });
      }
      if (data.fromPriceCents !== null && data.fromPriceCents !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Vaste prijs mag geen vanaf-prijs hebben",
          path: ["fromPriceCents"],
        });
      }
    }
    if (data.priceMode === "STARTING_FROM") {
      if (data.fromPriceCents === null || data.fromPriceCents <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Vanaf-prijs vereist een geldig bedrag",
          path: ["fromPriceCents"],
        });
      }
    }
    if (data.priceMode === "QUOTE_ONLY") {
      // quote-only: amounts optional
    }
    if (
      (data.billingType === "MONTHLY" || data.billingType === "YEARLY") &&
      data.priceMode === "FIXED"
    ) {
      // Allowed to store FIXED amount for display, but checkout remains blocked server-side
    }
  });

export const createProductSchema = productContentSchema.merge(
  z.object({
    pricing: productPricingSchema,
  }),
);

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
});

export const publishProductSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  targetStatus: z.enum(["PUBLISHED", "HIDDEN", "REVIEW", "DRAFT"]),
});

export const legalApprovalSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  legalStatus: z.enum([
    "NOT_REVIEWED",
    "INTERNAL_REVIEW",
    "LEGAL_REVIEW_REQUIRED",
    "APPROVED_FOR_B2B",
    "APPROVED_FOR_B2C",
    "APPROVED_FOR_BOTH",
  ]),
  priceStatus: z.enum([
    "DRAFT",
    "INTERNAL_REVIEW",
    "APPROVED",
    "PUBLISHED",
    "ARCHIVED",
  ]),
  publicationReady: z.boolean(),
  legalTermsVersion: z.string().max(80).nullable().optional(),
  legalInternalNote: z.string().max(2000).nullable().optional(),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  nameNl: z.string().max(120).nullable().optional(),
  descriptionNl: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  isActive: z.boolean().default(true),
  imagePath: z.string().max(500).nullable().optional(),
});

export const addonSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  name: z.string().min(2).max(200),
  description: z.string().max(2000).default(""),
  nameNl: z.string().max(200).nullable().optional(),
  descriptionNl: z.string().max(2000).nullable().optional(),
  priceCents: centsSchema,
  priceMode: priceModeSchema.default("QUOTE_ONLY"),
  billingType: billingTypeSchema.default("ONE_TIME"),
  audienceB2b: z.boolean().default(true),
  audienceB2c: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  productIds: z.array(z.string().uuid()).max(200).optional(),
});

export const bulkActionSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum([
    "set_category",
    "hide",
    "unhide",
    "archive",
    "set_badge",
    "set_sort_order",
  ]),
  categoryId: z.string().uuid().optional(),
  badge: z.string().max(80).nullable().optional(),
  sortOrder: z.number().int().min(0).max(99999).optional(),
});

export const mediaUploadMetaSchema = z.object({
  productId: z.string().uuid(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  byteSize: z.number().int().min(1).max(5_242_880),
  fileName: z.string().min(1).max(200),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  altTextNl: z.string().max(200).optional(),
  altTextEn: z.string().max(200).optional(),
  isPrimary: z.boolean().default(false),
});

/** Parse euro string like "12,50" or "12.50" into integer cents — no float money math beyond parse */
export function eurosToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt((frac + "00").slice(0, 2), 10);
  return Number.isFinite(cents) ? cents : null;
}

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type LegalApprovalInput = z.infer<typeof legalApprovalSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type AddonInput = z.infer<typeof addonSchema>;
export type BulkActionInput = z.infer<typeof bulkActionSchema>;
