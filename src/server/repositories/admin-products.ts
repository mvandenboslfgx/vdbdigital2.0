import "server-only";
import { createServiceRoleClient } from "@/lib/database/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import {
  isMissingSchemaError,
  mapDbMediaRow,
  mapDbProductRow,
  mapDbTranslationRow,
} from "@/server/repositories/map-product";
import { isLegacyTawkProduct } from "@/lib/commerce/tawk-legacy-blocklist";
import type {
  BillingType,
  PriceMode,
  Product,
  ProductAddon,
  ProductStatus,
} from "@/types";

/** Hide legacy removed products from the active admin catalog list. */
function applyLegacyAdminVisibility(
  products: Product[],
  status: ProductStatus | "ALL" | undefined,
): Product[] {
  const showArchivedLegacy = status === "ARCHIVED";
  return products.filter((p) => {
    if (!isLegacyTawkProduct(p)) return true;
    return showArchivedLegacy;
  });
}

export interface AdminProductListFilters {
  q?: string;
  categoryId?: string;
  status?: ProductStatus | "ALL";
  priceMode?: PriceMode | "ALL";
  billingType?: BillingType | "ALL";
  audience?: "B2B" | "B2C" | "BOTH" | "ALL";
  partnerHealth?:
    | "ALL"
    | "COMMISSION_CONFIGURATION_REQUIRED"
    | "LEGAL_REVIEW_REQUIRED"
    | "OWN_SERVICES_READY"
    | "HIDDEN_BLOCKED";
  sort?: "updated_at" | "name" | "sort_order" | "price";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminProductListResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  schemaExtended: boolean;
  error?: string;
}

const BASE_SELECT = "*, category:categories(id, slug, name)";

export async function getAdminProductList(
  filters: AdminProductListFilters = {},
): Promise<AdminProductListResult> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "products.read");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      schemaExtended: false,
      error: "Database is niet geconfigureerd",
    };
  }

  let query = supabase
    .from("products")
    .select(BASE_SELECT, { count: "exact" });

  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_,]/g, "");
    query = query.or(
      `name.ilike.%${q}%,slug.ilike.%${q}%,internal_sku.ilike.%${q}%`,
    );
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.priceMode && filters.priceMode !== "ALL") {
    query = query.eq("price_mode", filters.priceMode);
  }
  if (filters.billingType && filters.billingType !== "ALL") {
    query = query.eq("billing_type", filters.billingType);
  }
  if (filters.audience === "B2B") {
    query = query.eq("audience_b2b", true);
  } else if (filters.audience === "B2C") {
    query = query.eq("audience_b2c", true);
  } else if (filters.audience === "BOTH") {
    query = query.eq("audience_b2b", true).eq("audience_b2c", true);
  }
  if (filters.partnerHealth === "COMMISSION_CONFIGURATION_REQUIRED") {
    query = query
      .eq("partner_enabled", true)
      .or(
        "partner_commission_status.neq.active,partner_commission_value.is.null",
      );
  } else if (filters.partnerHealth === "LEGAL_REVIEW_REQUIRED") {
    query = query.in("legal_status", [
      "NOT_REVIEWED",
      "INTERNAL_REVIEW",
      "LEGAL_REVIEW_REQUIRED",
    ]);
  } else if (filters.partnerHealth === "OWN_SERVICES_READY") {
    query = query
      .eq("status", "PUBLISHED")
      .eq("publication_ready", true)
      .in("legal_status", [
        "APPROVED_FOR_B2B",
        "APPROVED_FOR_B2C",
        "APPROVED_FOR_BOTH",
      ])
      .in("price_status", ["APPROVED", "PUBLISHED"]);
  } else if (filters.partnerHealth === "HIDDEN_BLOCKED") {
    query = query.in("status", ["HIDDEN", "ARCHIVED"]);
  }

  const sort = filters.sort ?? "sort_order";
  const ascending = (filters.order ?? "asc") === "asc";
  const sortColumn =
    sort === "name"
      ? "name"
      : sort === "updated_at"
        ? "updated_at"
        : sort === "price"
          ? "price_cents"
          : "sort_order";

  query = query.order(sortColumn, { ascending, nullsFirst: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // Fallback without extended filters/columns when migration not applied
    if (isMissingSchemaError(error)) {
      const fallback = await supabase
        .from("products")
        .select(BASE_SELECT, { count: "exact" })
        .order("sort_order")
        .range(from, to);

      if (fallback.error) {
        return {
          products: [],
          total: 0,
          page,
          pageSize,
          schemaExtended: false,
          error: fallback.error.message,
        };
      }

      let products = (fallback.data ?? []).map(mapDbProductRow);
      if (filters.q?.trim()) {
        const q = filters.q.trim().toLowerCase();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q),
        );
      }
      if (filters.status && filters.status !== "ALL") {
        products = products.filter((p) => p.status === filters.status);
      }
      if (filters.billingType && filters.billingType !== "ALL") {
        products = products.filter((p) => p.billingType === filters.billingType);
      }

      products = applyLegacyAdminVisibility(products, filters.status);

      return {
        products,
        total: fallback.count ?? products.length,
        page,
        pageSize,
        schemaExtended: false,
      };
    }

    return {
      products: [],
      total: 0,
      page,
      pageSize,
      schemaExtended: false,
      error: error.message,
    };
  }

  const products = applyLegacyAdminVisibility(
    (data ?? []).map(mapDbProductRow),
    filters.status,
  );

  return {
    products,
    total: count ?? 0,
    page,
    pageSize,
    schemaExtended: true,
  };
}

export async function getAdminProductById(id: string): Promise<Product | null> {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "products.read");

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .select(BASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const product = mapDbProductRow(data);

  const { data: translations, error: trError } = await supabase
    .from("product_translations")
    .select("*")
    .eq("product_id", id);

  if (translations && !trError) {
    product.translations = translations.map(mapDbTranslationRow);
  }

  const { data: media, error: mediaError } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  if (media && !mediaError) {
    product.media = media.map(mapDbMediaRow);
  }

  const { data: faqs } = await supabase
    .from("product_faqs")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  if (faqs) {
    product.faqs = faqs.map((f) => ({
      id: f.id as string,
      question: f.question as string,
      answer: f.answer as string,
      sortOrder: f.sort_order as number,
    }));
  }

  const { data: features } = await supabase
    .from("product_features")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  if (features) {
    product.benefits = features
      .filter((f) => f.included)
      .map((f) => f.label as string);
  }

  const { data: links, error: linksError } = await supabase
    .from("product_addon_links")
    .select("sort_order, addon:product_addons(*)")
    .eq("product_id", id)
    .order("sort_order");

  if (links && !linksError) {
    const mapped: ProductAddon[] = [];
    for (const row of links) {
      const raw = row.addon as unknown;
      if (!raw || Array.isArray(raw) || typeof raw !== "object") continue;
      const a = raw as Record<string, unknown>;
      mapped.push({
        id: a.id as string,
        slug: a.slug as string,
        name: a.name as string,
        description: (a.description as string) ?? "",
        nameNl: (a.name_nl as string | null) ?? null,
        descriptionNl: (a.description_nl as string | null) ?? null,
        priceCents: a.price_cents as number | null,
        priceMode: a.price_mode as PriceMode,
        billingType: a.billing_type as BillingType,
        audienceB2b: Boolean(a.audience_b2b),
        audienceB2c: Boolean(a.audience_b2c),
        isActive: Boolean(a.is_active),
        sortOrder: (a.sort_order as number) ?? 0,
      });
    }
    product.addons = mapped;
  }

  return product;
}

/** @deprecated Prefer getAdminProductList */
export async function getAdminProducts(): Promise<Product[]> {
  const result = await getAdminProductList({ pageSize: 500 });
  return result.products;
}
