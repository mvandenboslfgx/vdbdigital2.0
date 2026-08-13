"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { sanitizeProductHtml, sanitizePlainText } from "@/lib/security/sanitize-html";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { AuthError } from "@/server/auth/errors";
import {
  assertNoOrderReferences,
  authorizeCatalogProduct,
} from "@/server/auth/authorize-catalog";
import {
  addonSchema,
  bulkActionSchema,
  categorySchema,
  createProductSchema,
  legalApprovalSchema,
  mediaUploadMetaSchema,
  publishProductSchema,
  updateProductSchema,
  type CreateProductInput,
} from "@/lib/validation/catalog";
import {
  canPublishAsMarketing,
  publicationBlockingErrors,
} from "@/lib/commerce/publication-checklist";
import {
  canTransitionTranslationStatus,
  computeTranslationSourceHash,
  downgradeStatusForBlockedPublish,
  getMissingTranslationFields,
  isTranslationSourceStale,
  type TranslationPublishBlockReason,
} from "@/lib/commerce/product-locale-merge";
import { hasPermission } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/get-dictionary";
import type { ProductTranslationStatus } from "@/types";
import { isMissingSchemaError, mapDbProductRow } from "@/server/repositories/map-product";
import {
  csvRow,
  FORBIDDEN_IMPORT_HEADERS,
  normalizeImportedCell,
  parseCsv,
  PRODUCT_EXPORT_HEADERS,
} from "@/lib/catalog/csv";
import {
  isLegacyTawkProduct,
  isLegacyTawkAddon,
  LEGACY_TAWK_PUBLIC_DENIED_MESSAGE,
} from "@/lib/commerce/tawk-legacy-blocklist";

const LEGACY_BLOCKED = LEGACY_TAWK_PUBLIC_DENIED_MESSAGE;

export type CatalogActionState = {
  error?: string;
  success?: boolean;
  productId?: string;
  warnings?: string[];
  importPreview?: Array<{ row: number; ok: boolean; message: string }>;
};

function deny(): CatalogActionState {
  return { error: "Verzoek geweigerd." };
}

function mapZodError(error: { issues: Array<{ message: string; path: PropertyKey[] }> }): string {
  return error.issues.map((i) => i.message).join("; ");
}

function buildProductInsert(data: CreateProductInput, userId: string) {
  const pricing = data.pricing;
  const priceMode = pricing.priceMode;
  const priceCents = priceMode === "FIXED" ? pricing.priceCents : null;
  const fromPriceCents = priceMode === "STARTING_FROM" ? pricing.fromPriceCents : null;

  return {
    name: sanitizePlainText(data.name, 200),
    slug: data.slug,
    internal_sku: data.internalSku ?? null,
    short_description: sanitizePlainText(data.shortDescription, 2000),
    full_description: sanitizeProductHtml(data.fullDescription),
    category_id: data.categoryId ?? null,
    price_cents: priceCents,
    from_price_cents: fromPriceCents,
    price_mode: priceMode,
    billing_type: pricing.billingType,
    currency: pricing.currency,
    vat_percent: pricing.vatPercent,
    price_includes_vat: pricing.priceIncludesVat,
    compare_at_cents: pricing.compareAtCents ?? null,
    price_label: pricing.priceLabel ?? null,
    cost_cents: pricing.costCents ?? null,
    badge: data.badge ?? null,
    tags: data.tags,
    sort_order: data.sortOrder,
    featured: data.featured,
    delivery_time: data.deliveryTime,
    included_items: data.includedItems,
    excluded_items: data.excludedItems,
    extensions: data.extensions,
    benefits: data.benefits,
    target_audience: data.targetAudience ?? null,
    workflow: data.workflow ?? null,
    required_input: data.requiredInput,
    cta_label: data.ctaLabel ?? null,
    quote_cta_label: data.quoteCtaLabel ?? null,
    warnings: data.warnings ?? null,
    seo_title: data.seoTitle,
    seo_description: data.seoDescription,
    audience_b2b: data.audienceB2b,
    audience_b2c: data.audienceB2c,
    partner_enabled: data.partnerEnabled ?? false,
    partner_visibility: data.partnerVisibility ?? "none",
    partner_commission_type: data.partnerCommissionType ?? "bps",
    partner_commission_value: data.partnerCommissionValue ?? null,
    partner_commission_currency: data.partnerCommissionCurrency ?? "EUR",
    partner_commission_status: data.partnerCommissionStatus ?? "draft",
    partner_minimum_price_cents: data.partnerMinimumPriceCents ?? null,
    partner_maximum_discount_bps: data.partnerMaximumDiscountBps ?? null,
    partner_requires_approval: data.partnerRequiresApproval ?? true,
    partner_terms: data.partnerTerms ?? null,
    partner_sales_copy: data.partnerSalesCopy ?? null,
    partner_availability: data.partnerAvailability ?? "available",
    partner_priority: data.partnerPriority ?? 100,
    partner_featured: data.partnerFeatured ?? false,
    // Fail-closed commercial defaults — never auto-approve
    price_status: "DRAFT",
    legal_status: "NOT_REVIEWED",
    publication_ready: false,
    status: "DRAFT",
    is_concept: true,
    version: 1,
    updated_by: userId,
  };
}

const TRANSLATION_BLOCK_KEYS: Record<TranslationPublishBlockReason, string> = {
  forbidden: "admin.translation.blocked.forbidden",
  not_approved: "admin.translation.blocked.notApproved",
  missing_fields: "admin.translation.blocked.missingFields",
  stale: "admin.translation.blocked.stale",
};

interface UpsertTranslationsOptions {
  productId: string;
  translations: CreateProductInput["translations"];
  canPublish: boolean;
  /** Fingerprint of the English source copy being saved alongside these rows. */
  sourceHash: string;
  actorUserId: string;
}

/**
 * Upsert product_translations rows, enforcing the publish gate documented in
 * canTransitionTranslationStatus(): promotion to 'published' requires the
 * 'products.publish' capability, every required copy field, an unchanged
 * English source, and a prior human review ('approved'). Any blocked
 * transition is safely downgraded (never silently dropped, never
 * auto-published) and surfaced back to the caller as a warning string.
 *
 * Every status change is written to the audit log, so a promotion to
 * 'published' — the only status a visitor can ever see — is always
 * attributable to a person.
 */
async function upsertTranslations({
  productId,
  translations,
  canPublish,
  sourceHash,
  actorUserId,
}: UpsertTranslationsOptions): Promise<string[]> {
  const warnings: string[] = [];
  if (!translations?.length) return warnings;
  const supabase = createServiceRoleClient();
  if (!supabase) return warnings;

  const { t } = await getDictionary();

  for (const translation of translations) {
    const localeLabel = translation.locale.toUpperCase();
    const row: Record<string, unknown> = {
      product_id: productId,
      locale: translation.locale,
      name: sanitizePlainText(translation.name, 200),
      slug: translation.slug ?? null,
      short_description: sanitizePlainText(translation.shortDescription, 2000),
      full_description: sanitizeProductHtml(translation.fullDescription),
      benefits: translation.benefits,
      included_items: translation.includedItems,
      excluded_items: translation.excludedItems,
      cta_label: translation.ctaLabel ?? null,
      quote_cta_label: translation.quoteCtaLabel ?? null,
      seo_title: translation.seoTitle ?? null,
      seo_description: translation.seoDescription ?? null,
      delivery_time: translation.deliveryTime ?? null,
      target_audience: translation.targetAudience ?? null,
      workflow: translation.workflow ?? null,
      warnings: translation.warnings ?? null,
      updated_at: new Date().toISOString(),
    };

    // Workflow status columns require the Phase 4 migration
    // (20260801140000_product_translation_status.sql). Never sent when
    // undefined so pre-migration environments keep working (DB default 'draft').
    if (translation.status) {
      let nextStatus: ProductTranslationStatus = translation.status;

      const { data: existingRow } = await supabase
        .from("product_translations")
        .select("status, source_hash")
        .eq("product_id", productId)
        .eq("locale", translation.locale)
        .maybeSingle();

      const previousStatus =
        (existingRow?.status as ProductTranslationStatus | undefined) ?? null;
      const sourceStale = isTranslationSourceStale(
        (existingRow?.source_hash as string | null | undefined) ?? null,
        sourceHash,
      );

      if (nextStatus === "published") {
        const missingFields = getMissingTranslationFields(translation);
        const gate = canTransitionTranslationStatus("published", {
          missingFields,
          previousStatus,
          canPublish,
          sourceStale,
        });

        if (!gate.allowed && gate.reason) {
          nextStatus = downgradeStatusForBlockedPublish(gate.reason);
          warnings.push(
            t(TRANSLATION_BLOCK_KEYS[gate.reason], {
              locale: localeLabel,
              fields: missingFields.join(", "),
            }),
          );
        }
      } else if (sourceStale && nextStatus !== "stale") {
        // Source drifted under an already-reviewed translation: hold it at
        // 'stale' so it cannot silently keep an approved/published badge.
        if (previousStatus === "approved" || previousStatus === "published") {
          nextStatus = "stale";
          warnings.push(t("admin.translation.blocked.stale", { locale: localeLabel }));
        }
      }

      row.status = nextStatus;
      row.source_hash = sourceHash;
      if (nextStatus === "approved") {
        row.reviewed_at = new Date().toISOString();
      }
      if (nextStatus === "published") {
        row.published_at = new Date().toISOString();
      }

      if (previousStatus !== nextStatus) {
        await writeAuditLog({
          userId: actorUserId,
          action: "product.translation.status_changed",
          resourceType: "product_translation",
          resourceId: `${productId}:${translation.locale}`,
          metadata: {
            productId,
            locale: translation.locale,
            fromStatus: previousStatus ?? "none",
            toStatus: nextStatus,
            requestedStatus: translation.status,
            sourceStale,
            canPublish,
          },
        });
      }
    }

    const { error } = await supabase
      .from("product_translations")
      .upsert(row, { onConflict: "product_id,locale" });

    if (error && !isMissingSchemaError(error)) {
      console.error("upsertTranslations failed", error.message);
    } else if (error && isMissingSchemaError(error) && "status" in row) {
      // Migration not applied yet — retry without the new workflow columns.
      delete row.status;
      delete row.source_hash;
      delete row.reviewed_at;
      delete row.published_at;
      await supabase
        .from("product_translations")
        .upsert(row, { onConflict: "product_id,locale" });
    }
  }

  return warnings;
}

export async function createProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();

  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.create");

    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = createProductSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: mapZodError(parsed.error) };
    }

    if (
      isLegacyTawkProduct({
        slug: parsed.data.slug,
        name: parsed.data.name,
        internalSku: parsed.data.internalSku ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    // Price changes on create still require change_price when setting amounts
    if (
      parsed.data.pricing.priceCents ||
      parsed.data.pricing.fromPriceCents ||
      parsed.data.pricing.priceMode === "FIXED"
    ) {
      await requirePermission(ctx, "products.change_price");
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const row = buildProductInsert(parsed.data, ctx.user.id);
    const { data, error } = await supabase.from("products").insert(row).select("id").single();

    if (error) {
      return {
        error: error.message.includes("does not exist")
          ? "Catalogusmigratie is nog niet toegepast. Zie docs/CATALOG_ADMIN_MIGRATION.md."
          : error.message,
      };
    }

    const translationWarnings = await upsertTranslations({
      productId: data.id,
      translations: parsed.data.translations,
      canPublish: hasPermission(ctx.role, "products.publish"),
      sourceHash: computeTranslationSourceHash(parsed.data),
      actorUserId: ctx.user.id,
    });

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.created",
      resourceType: "product",
      resourceId: data.id,
      metadata: { slug: parsed.data.slug, priceMode: parsed.data.pricing.priceMode },
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      productId: data.id,
      warnings: translationWarnings.length > 0 ? translationWarnings : undefined,
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor deze actie." };
    return { error: "Product aanmaken mislukt." };
  }
}

export async function updateProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();

  try {
    const ctx = await requireAdmin();
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = updateProductSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    const existing = await authorizeCatalogProduct(ctx, parsed.data.id, "products.update");

    if ((existing.version as number | undefined) !== parsed.data.expectedVersion) {
      return {
        error:
          "Dit product is ondertussen gewijzigd door iemand anders. Ververs de pagina en probeer opnieuw.",
      };
    }

    if (
      isLegacyTawkProduct({
        id: existing.id as string,
        slug: (existing.slug as string) ?? parsed.data.slug,
        name: (existing.name as string) ?? parsed.data.name,
        internalSku: (existing.internal_sku as string | null) ?? null,
      }) ||
      isLegacyTawkProduct({
        slug: parsed.data.slug,
        name: parsed.data.name,
        internalSku: parsed.data.internalSku ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    const priceChanged =
      existing.price_cents !== parsed.data.pricing.priceCents ||
      existing.from_price_cents !== parsed.data.pricing.fromPriceCents ||
      existing.price_mode !== parsed.data.pricing.priceMode ||
      existing.billing_type !== parsed.data.pricing.billingType;

    if (priceChanged) {
      await requirePermission(ctx, "products.change_price");
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const insertLike = buildProductInsert(parsed.data, ctx.user.id);
    const {
      status,
      is_concept,
      version,
      price_status,
      legal_status,
      publication_ready,
      ...safeUpdate
    } = insertLike;
    void status;
    void is_concept;
    void version;
    void price_status;
    void legal_status;
    void publication_ready;

    const { data, error } = await supabase
      .from("products")
      .update({
        ...safeUpdate,
        version: parsed.data.expectedVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        error: error.message.includes("does not exist")
          ? "Catalogusmigratie is nog niet toegepast. Zie docs/CATALOG_ADMIN_MIGRATION.md."
          : error.message,
      };
    }
    if (!data) {
      return {
        error:
          "Dit product is ondertussen gewijzigd door iemand anders. Ververs de pagina en probeer opnieuw.",
      };
    }

    const translationWarnings = await upsertTranslations({
      productId: parsed.data.id,
      translations: parsed.data.translations,
      canPublish: hasPermission(ctx.role, "products.publish"),
      sourceHash: computeTranslationSourceHash(parsed.data),
      actorUserId: ctx.user.id,
    });

    await writeAuditLog({
      userId: ctx.user.id,
      action: priceChanged ? "product.price_changed" : "product.updated",
      resourceType: "product",
      resourceId: parsed.data.id,
      metadata: {
        before: {
          price_cents: existing.price_cents,
          price_mode: existing.price_mode,
          billing_type: existing.billing_type,
        },
        after: {
          price_cents: parsed.data.pricing.priceCents,
          price_mode: parsed.data.pricing.priceMode,
          billing_type: parsed.data.pricing.billingType,
        },
      },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.id}`);
    return {
      success: true,
      productId: parsed.data.id,
      warnings: translationWarnings.length > 0 ? translationWarnings : undefined,
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor deze actie." };
    return { error: "Product bijwerken mislukt." };
  }
}

export async function publishProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();

  try {
    const ctx = await requireAdmin();
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = publishProductSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    const existing = await authorizeCatalogProduct(ctx, parsed.data.id, "products.publish");
    if ((existing.version as number | undefined) !== parsed.data.expectedVersion) {
      return { error: "Versieconflict. Ververs de pagina." };
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { data: full } = await supabase
      .from("products")
      .select("*, category:categories(id, slug, name)")
      .eq("id", parsed.data.id)
      .single();

    if (!full) return { error: "Product niet gevonden." };
    const product = mapDbProductRow(full);

    if (isLegacyTawkProduct(product)) {
      return { error: LEGACY_BLOCKED };
    }

    if (parsed.data.targetStatus === "PUBLISHED") {
      if (!canPublishAsMarketing(product)) {
        return { error: "Product mist verplichte content voor publicatie." };
      }
      const blocking = publicationBlockingErrors(product);
      if (blocking.length > 0) {
        return { error: blocking.map((b) => b.message).join("; ") };
      }
    }

    const isConcept = parsed.data.targetStatus !== "PUBLISHED";
    const { data, error } = await supabase
      .from("products")
      .update({
        status: parsed.data.targetStatus,
        is_concept: isConcept,
        version: parsed.data.expectedVersion + 1,
        updated_by: ctx.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: error?.message ?? "Publicatie mislukt (versieconflict)." };
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action:
        parsed.data.targetStatus === "PUBLISHED"
          ? "product.published"
          : parsed.data.targetStatus === "HIDDEN"
            ? "product.hidden"
            : "product.status_changed",
      resourceType: "product",
      resourceId: parsed.data.id,
      metadata: {
        from: existing.status,
        to: parsed.data.targetStatus,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.id}`);
    return {
      success: true,
      productId: parsed.data.id,
      warnings: [
        "Directe checkout is momenteel algemeen uitgeschakeld.",
        "Marketingpublicatie zet juridische goedkeuring of checkout eligibility niet automatisch aan.",
      ],
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor publiceren." };
    return { error: "Publiceren mislukt." };
  }
}

export async function updateLegalApprovalAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();

  try {
    const ctx = await requireAdmin();
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = legalApprovalSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    const existing = await authorizeCatalogProduct(
      ctx,
      parsed.data.id,
      "products.legal_approve",
    );

    if ((existing.version as number | undefined) !== parsed.data.expectedVersion) {
      return { error: "Versieconflict. Ververs de pagina." };
    }

    if (
      isLegacyTawkProduct({
        id: existing.id as string,
        slug: existing.slug as string,
        name: existing.name as string,
        internalSku: (existing.internal_sku as string | null) ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const approved =
      parsed.data.legalStatus === "APPROVED_FOR_B2B" ||
      parsed.data.legalStatus === "APPROVED_FOR_B2C" ||
      parsed.data.legalStatus === "APPROVED_FOR_BOTH";

    const { data, error } = await supabase
      .from("products")
      .update({
        legal_status: parsed.data.legalStatus,
        price_status: parsed.data.priceStatus,
        publication_ready: parsed.data.publicationReady,
        legal_terms_version: parsed.data.legalTermsVersion ?? null,
        legal_internal_note: parsed.data.legalInternalNote
          ? sanitizePlainText(parsed.data.legalInternalNote, 2000)
          : null,
        legal_approved_by: approved ? ctx.user.id : null,
        legal_approved_at: approved ? new Date().toISOString() : null,
        version: parsed.data.expectedVersion + 1,
        updated_by: ctx.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: error?.message ?? "Juridische goedkeuring bijwerken mislukt." };
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: approved ? "product.legal_approved" : "product.legal_revoked",
      resourceType: "product",
      resourceId: parsed.data.id,
      metadata: {
        before: {
          legal_status: existing.legal_status,
          price_status: existing.price_status,
          publication_ready: existing.publication_ready,
        },
        after: {
          legal_status: parsed.data.legalStatus,
          price_status: parsed.data.priceStatus,
          publication_ready: parsed.data.publicationReady,
        },
      },
    });

    revalidatePath(`/admin/products/${parsed.data.id}`);
    return { success: true, productId: parsed.data.id };
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Alleen een beheerder met juridische rechten mag dit wijzigen." };
    }
    return { error: "Juridische goedkeuring mislukt." };
  }
}

export async function archiveProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const expectedVersion = Number(formData.get("expectedVersion"));
    const existing = await authorizeCatalogProduct(ctx, id, "products.archive");

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { error } = await supabase
      .from("products")
      .update({
        status: "ARCHIVED",
        is_concept: true,
        version: expectedVersion + 1,
        updated_by: ctx.user.id,
      })
      .eq("id", id)
      .eq("version", expectedVersion);

    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.archived",
      resourceType: "product",
      resourceId: id,
      metadata: { from: existing.status },
    });

    revalidatePath("/admin/products");
    return { success: true, productId: id };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming om te archiveren." };
    return { error: "Archiveren mislukt." };
  }
}

export async function restoreProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const expectedVersion = Number(formData.get("expectedVersion"));
    const existing = await authorizeCatalogProduct(ctx, id, "products.archive");

    if (
      isLegacyTawkProduct({
        id: existing.id as string,
        slug: existing.slug as string,
        name: existing.name as string,
        internalSku: (existing.internal_sku as string | null) ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { error } = await supabase
      .from("products")
      .update({
        status: "DRAFT",
        is_concept: true,
        version: expectedVersion + 1,
        updated_by: ctx.user.id,
      })
      .eq("id", id)
      .eq("version", expectedVersion);

    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.restored",
      resourceType: "product",
      resourceId: id,
    });

    revalidatePath("/admin/products");
    return { success: true, productId: id };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming." };
    return { error: "Herstellen mislukt." };
  }
}

export async function duplicateProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.create");
    const id = String(formData.get("id") ?? "");
    await authorizeCatalogProduct(ctx, id, "products.read");

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { data: source } = await supabase.from("products").select("*").eq("id", id).single();
    if (!source) return { error: "Bronproduct niet gevonden." };

    if (
      isLegacyTawkProduct({
        id: source.id as string,
        slug: source.slug as string,
        name: source.name as string,
        internalSku: (source.internal_sku as string | null) ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    const clone = { ...(source as Record<string, unknown>) };
    delete clone.id;
    clone.slug = `${source.slug}-kopie-${Date.now().toString(36)}`;
    clone.name = `${source.name} (kopie)`;
    clone.internal_sku = source.internal_sku
      ? `${source.internal_sku}-COPY`
      : null;
    clone.status = "DRAFT";
    clone.is_concept = true;
    clone.legal_status = "NOT_REVIEWED";
    clone.price_status = "DRAFT";
    clone.publication_ready = false;
    clone.legal_approved_by = null;
    clone.legal_approved_at = null;
    clone.version = 1;
    clone.updated_by = ctx.user.id;

    const { data, error } = await supabase.from("products").insert(clone).select("id").single();
    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.duplicated",
      resourceType: "product",
      resourceId: data.id,
      metadata: { sourceId: id },
    });

    revalidatePath("/admin/products");
    return { success: true, productId: data.id };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming." };
    return { error: "Dupliceren mislukt." };
  }
}

export async function deleteProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    await authorizeCatalogProduct(ctx, id, "products.archive");

    const canDelete = await assertNoOrderReferences(id);
    if (!canDelete) {
      return {
        error:
          "Verwijderen geblokkeerd: er zijn orders of winkelwagenregels gekoppeld. Archiveer het product in plaats daarvan.",
      };
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.deleted",
      resourceType: "product",
      resourceId: id,
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming." };
    return { error: "Verwijderen mislukt." };
  }
}

export async function saveCategoryAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "categories.manage");
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const row = {
      slug: parsed.data.slug,
      name: sanitizePlainText(parsed.data.name, 120),
      description: sanitizePlainText(parsed.data.description, 2000),
      name_nl: parsed.data.nameNl ? sanitizePlainText(parsed.data.nameNl, 120) : null,
      description_nl: parsed.data.descriptionNl
        ? sanitizePlainText(parsed.data.descriptionNl, 2000)
        : null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      image_path: parsed.data.imagePath ?? null,
      updated_at: new Date().toISOString(),
    };

    let id = parsed.data.id;
    if (id) {
      const { error } = await supabase.from("categories").update(row).eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase.from("categories").insert(row).select("id").single();
      if (error) return { error: error.message };
      id = data.id;
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: parsed.data.id ? "category.updated" : "category.created",
      resourceType: "category",
      resourceId: id,
    });

    revalidatePath("/admin/categories");
    return { success: true, productId: id };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor categorieën." };
    return { error: "Categorie opslaan mislukt." };
  }
}

export async function deleteCategoryAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "categories.manage");
    const id = String(formData.get("id") ?? "");

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .neq("status", "ARCHIVED");

    if ((count ?? 0) > 0) {
      return {
        error:
          "Verwijderen geblokkeerd: er zijn nog actieve producten gekoppeld. Verplaats ze eerst.",
      };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "category.deleted",
      resourceType: "category",
      resourceId: id,
    });

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming." };
    return { error: "Categorie verwijderen mislukt." };
  }
}

export async function saveAddonAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.manage_addons");
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = addonSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    if (
      isLegacyTawkAddon({
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
      }) ||
      isLegacyTawkAddon({
        slug: parsed.data.slug,
        name: parsed.data.nameNl ?? null,
        description: parsed.data.descriptionNl ?? null,
      })
    ) {
      return { error: LEGACY_BLOCKED };
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const row = {
      slug: parsed.data.slug,
      name: sanitizePlainText(parsed.data.name, 200),
      description: sanitizePlainText(parsed.data.description, 2000),
      name_nl: parsed.data.nameNl ? sanitizePlainText(parsed.data.nameNl, 200) : null,
      description_nl: parsed.data.descriptionNl
        ? sanitizePlainText(parsed.data.descriptionNl, 2000)
        : null,
      price_cents: parsed.data.priceCents,
      price_mode: parsed.data.priceMode,
      billing_type: parsed.data.billingType,
      audience_b2b: parsed.data.audienceB2b,
      audience_b2c: parsed.data.audienceB2c,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      updated_at: new Date().toISOString(),
    };

    let id = parsed.data.id;
    if (id) {
      const { error } = await supabase.from("product_addons").update(row).eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase
        .from("product_addons")
        .insert(row)
        .select("id")
        .single();
      if (error) return { error: error.message };
      id = data.id;
    }

    if (parsed.data.productIds) {
      await supabase.from("product_addon_links").delete().eq("addon_id", id);
      if (parsed.data.productIds.length > 0) {
        await supabase.from("product_addon_links").insert(
          parsed.data.productIds.map((productId, index) => ({
            addon_id: id,
            product_id: productId,
            sort_order: index,
          })),
        );
      }
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: parsed.data.id ? "addon.updated" : "addon.created",
      resourceType: "product_addon",
      resourceId: id,
    });

    revalidatePath("/admin/addons");
    return { success: true, productId: id };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor add-ons." };
    return { error: "Add-on opslaan mislukt." };
  }
}

export async function bulkProductAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = bulkActionSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    await requirePermission(ctx, "products.update");
    if (parsed.data.action === "archive") {
      await requirePermission(ctx, "products.archive");
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const ids = parsed.data.productIds;
    const { data: candidates } = await supabase
      .from("products")
      .select("id, slug, name, internal_sku")
      .in("id", ids);

    const allowedIds = (candidates ?? [])
      .filter(
        (row) =>
          !isLegacyTawkProduct({
            id: row.id as string,
            slug: row.slug as string,
            name: row.name as string,
            internalSku: (row.internal_sku as string | null) ?? null,
          }),
      )
      .map((row) => row.id as string);

    if (allowedIds.length === 0) {
      return { error: LEGACY_BLOCKED };
    }

    const update: Record<string, unknown> = {
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    };

    switch (parsed.data.action) {
      case "set_category":
        if (!parsed.data.categoryId) return { error: "Categorie is verplicht." };
        update.category_id = parsed.data.categoryId;
        break;
      case "hide":
        update.status = "HIDDEN";
        update.is_concept = true;
        break;
      case "unhide":
        update.status = "DRAFT";
        update.is_concept = true;
        break;
      case "archive":
        update.status = "ARCHIVED";
        update.is_concept = true;
        break;
      case "set_badge":
        update.badge = parsed.data.badge ?? null;
        break;
      case "set_sort_order":
        if (parsed.data.sortOrder === undefined) {
          return { error: "Sorteerpositie is verplicht." };
        }
        update.sort_order = parsed.data.sortOrder;
        break;
      default:
        return { error: "Onbekende bulkactie." };
    }

    const { error } = await supabase.from("products").update(update).in("id", allowedIds);
    if (error) return { error: error.message };

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.bulk_action",
      resourceType: "product",
      metadata: {
        action: parsed.data.action,
        count: allowedIds.length,
        ids: allowedIds.slice(0, 20),
        skippedLegacy: ids.length - allowedIds.length,
      },
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor bulkacties." };
    return { error: "Bulkactie mislukt." };
  }
}

export async function registerProductMediaAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.manage_media");
    const raw = JSON.parse(String(formData.get("payload") ?? "{}")) as unknown;
    const parsed = mediaUploadMetaSchema.safeParse(raw);
    if (!parsed.success) return { error: mapZodError(parsed.error) };

    await authorizeCatalogProduct(ctx, parsed.data.productId, "products.update");

    const ext =
      parsed.data.mimeType === "image/png"
        ? "png"
        : parsed.data.mimeType === "image/webp"
          ? "webp"
          : parsed.data.mimeType === "image/gif"
            ? "gif"
            : "jpg";

    const safeName = parsed.data.fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 80);
    const storagePath = `products/${parsed.data.productId}/${Date.now()}-${safeName || "image"}.${ext}`;

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { data, error } = await supabase
      .from("product_media")
      .insert({
        product_id: parsed.data.productId,
        storage_path: storagePath,
        mime_type: parsed.data.mimeType,
        byte_size: parsed.data.byteSize,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        is_primary: parsed.data.isPrimary,
        alt_text_nl: parsed.data.altTextNl ?? null,
        alt_text_en: parsed.data.altTextEn ?? null,
      })
      .select("id, storage_path")
      .single();

    if (error) {
      return {
        error: error.message.includes("does not exist")
          ? "Catalogusmigratie (media) is nog niet toegepast."
          : error.message,
      };
    }

    if (parsed.data.isPrimary) {
      await supabase
        .from("products")
        .update({ primary_image_path: storagePath })
        .eq("id", parsed.data.productId);
      await supabase
        .from("product_media")
        .update({ is_primary: false })
        .eq("product_id", parsed.data.productId)
        .neq("id", data.id);
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.media_changed",
      resourceType: "product",
      resourceId: parsed.data.productId,
      metadata: { mediaId: data.id, mimeType: parsed.data.mimeType, byteSize: parsed.data.byteSize },
    });

    revalidatePath(`/admin/products/${parsed.data.productId}`);
    return { success: true, productId: data.storage_path };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming voor media." };
    return { error: "Media registreren mislukt." };
  }
}

export async function exportProductsCsvAction(): Promise<{
  error?: string;
  csv?: string;
}> {
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.export");

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(slug, name)")
      .order("sort_order");

    if (error) return { error: error.message };

    const lines = [csvRow([...PRODUCT_EXPORT_HEADERS])];
    for (const row of data ?? []) {
      const p = mapDbProductRow(row as Record<string, unknown>);
      lines.push(
        csvRow([
          p.internalSku ?? "",
          p.name,
          p.slug,
          p.categorySlug,
          p.priceCents,
          p.fromPriceCents,
          p.priceMode ?? "",
          p.billingType,
          p.status,
          p.audienceB2b ? "true" : "false",
          p.audienceB2c ? "true" : "false",
          p.seoTitle,
          p.seoDescription,
          p.updatedAt ?? "",
        ]),
      );
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.exported",
      resourceType: "product",
      metadata: { count: data?.length ?? 0 },
    });

    return { csv: lines.join("\n") };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming om te exporteren." };
    return { error: "Export mislukt." };
  }
}

export async function previewProductImportAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.import");

    const csvText = String(formData.get("csv") ?? "");
    const rows = parseCsv(csvText);
    if (rows.length < 2) return { error: "CSV bevat geen datarijen." };

    const headers = rows[0].map((h) => normalizeImportedCell(h).toLowerCase());
    for (const forbidden of FORBIDDEN_IMPORT_HEADERS) {
      if (headers.includes(forbidden)) {
        return {
          error: `Kolom "${forbidden}" mag niet worden geïmporteerd (juridische goedkeuring / checkout).`,
        };
      }
    }

    const preview: Array<{ row: number; ok: boolean; message: string }> = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].map(normalizeImportedCell);
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = cells[idx] ?? "";
      });

      if (!record.name || !record.slug) {
        preview.push({ row: i + 1, ok: false, message: "Naam en slug zijn verplicht" });
        continue;
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) {
        preview.push({ row: i + 1, ok: false, message: "Ongeldige slug" });
        continue;
      }
      if (
        isLegacyTawkProduct({
          slug: record.slug,
          name: record.name,
          internalSku: record.internal_sku || record.sku || null,
        })
      ) {
        preview.push({
          row: i + 1,
          ok: false,
          message: LEGACY_BLOCKED,
        });
        continue;
      }
      preview.push({
        row: i + 1,
        ok: true,
        message: `Wordt geïmporteerd als concept: ${record.name}`,
      });
    }

    return { success: true, importPreview: preview };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming om te importeren." };
    return { error: "Importpreview mislukt." };
  }
}

export async function commitProductImportAction(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!(await verifyOrigin())) return deny();
  try {
    const ctx = await requireAdmin();
    await requirePermission(ctx, "products.import");
    await requirePermission(ctx, "products.create");

    const csvText = String(formData.get("csv") ?? "");
    const rows = parseCsv(csvText);
    if (rows.length < 2) return { error: "CSV bevat geen datarijen." };

    const headers = rows[0].map((h) => normalizeImportedCell(h).toLowerCase());
    for (const forbidden of FORBIDDEN_IMPORT_HEADERS) {
      if (headers.includes(forbidden)) {
        return { error: `Kolom "${forbidden}" is niet toegestaan bij import.` };
      }
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return { error: "Database is niet geconfigureerd." };

    const report: Array<{ row: number; ok: boolean; message: string }> = [];
    let created = 0;

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].map(normalizeImportedCell);
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = cells[idx] ?? "";
      });

      if (!record.name || !record.slug) {
        report.push({ row: i + 1, ok: false, message: "Naam/slug ontbreekt" });
        continue;
      }

      if (
        isLegacyTawkProduct({
          slug: record.slug,
          name: record.name,
          internalSku: record.internal_sku || record.sku || null,
        })
      ) {
        report.push({
          row: i + 1,
          ok: false,
          message: LEGACY_BLOCKED,
        });
        continue;
      }

      const priceMode = (record.price_mode || "QUOTE_ONLY").toUpperCase();
      const insert = {
        name: sanitizePlainText(record.name, 200),
        slug: record.slug,
        internal_sku: record.sku || null,
        short_description: sanitizePlainText(record.short_description || record.name, 2000),
        full_description: sanitizeProductHtml(record.full_description || record.name),
        price_cents: record.price_cents ? Number.parseInt(record.price_cents, 10) : null,
        from_price_cents: record.from_price_cents
          ? Number.parseInt(record.from_price_cents, 10)
          : null,
        price_mode: ["FIXED", "STARTING_FROM", "QUOTE_ONLY"].includes(priceMode)
          ? priceMode
          : "QUOTE_ONLY",
        billing_type: (record.billing_model || "ONE_TIME").toUpperCase(),
        status: "DRAFT",
        is_concept: true,
        price_status: "DRAFT",
        legal_status: "NOT_REVIEWED",
        publication_ready: false,
        audience_b2b: record.audience_b2b !== "false",
        audience_b2c: record.audience_b2c === "true",
        seo_title: record.seo_title || "",
        seo_description: record.seo_description || "",
        version: 1,
        updated_by: ctx.user.id,
      };

      const { error } = await supabase.from("products").insert(insert);
      if (error) {
        report.push({ row: i + 1, ok: false, message: error.message });
      } else {
        created += 1;
        report.push({ row: i + 1, ok: true, message: "Concept aangemaakt" });
      }
    }

    await writeAuditLog({
      userId: ctx.user.id,
      action: "product.imported",
      resourceType: "product",
      metadata: { created, totalRows: rows.length - 1 },
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      importPreview: report,
      warnings: [
        "Alle geïmporteerde rijen zijn als concept opgeslagen.",
        "Juridische goedkeuring en checkout eligibility zijn niet geïmporteerd.",
      ],
    };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Geen toestemming." };
    return { error: "Import mislukt." };
  }
}
