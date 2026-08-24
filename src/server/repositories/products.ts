import "server-only";
import type { Category, Product } from "@/types";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import {
  mapDbMediaRow,
  mapDbProductRow,
  mapDbTranslationRow,
} from "@/server/repositories/map-product";
import {
  isLegacyTawkCategorySlug,
  isLegacyTawkProduct,
} from "@/lib/commerce/tawk-legacy-blocklist";

function mapDbProduct(row: Record<string, unknown>): Product {
  return mapDbProductRow(row);
}

function excludeLegacyTawkProducts(products: Product[]): Product[] {
  return products.filter((p) => !isLegacyTawkProduct(p));
}

function excludeLegacyTawkCategories(cats: Category[]): Category[] {
  return cats.filter((c) => !isLegacyTawkCategorySlug(c.slug));
}

type CatalogClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function hydrateCatalogRelations(
  supabase: CatalogClient,
  products: Product[],
): Promise<Product[]> {
  if (products.length === 0) return products;
  const ids = products.map((product) => product.id);
  const [{ data: translationRows, error: translationError }, { data: mediaRows, error: mediaError }] =
    await Promise.all([
      supabase.from("product_translations").select("*").in("product_id", ids),
      supabase
        .from("product_media")
        .select("*")
        .in("product_id", ids)
        .order("sort_order"),
    ]);

  if (translationError || mediaError) return [];

  const translationsByProduct = new Map<string, Product["translations"]>();
  for (const row of translationRows ?? []) {
    const productId = String(row.product_id);
    const list = translationsByProduct.get(productId) ?? [];
    list.push(mapDbTranslationRow(row as Record<string, unknown>));
    translationsByProduct.set(productId, list);
  }

  const mediaByProduct = new Map<string, Product["media"]>();
  for (const row of mediaRows ?? []) {
    const productId = String(row.product_id);
    const list = mediaByProduct.get(productId) ?? [];
    list.push(mapDbMediaRow(row as Record<string, unknown>));
    mediaByProduct.set(productId, list);
  }

  const primaryPaths = products
    .map((product) =>
      mediaByProduct.get(product.id)?.find((media) => media.isPrimary)?.storagePath,
    )
    .filter((path): path is string => Boolean(path));
  const signedUrlByPath = new Map<string, string>();
  if (primaryPaths.length > 0) {
    const { data: signedRows } = await supabase.storage
      .from("product-media")
      .createSignedUrls(primaryPaths, 60 * 60);
    for (const row of signedRows ?? []) {
      if (row.path && row.signedUrl) signedUrlByPath.set(row.path, row.signedUrl);
    }
  }

  return products.map((product) => {
    const media = mediaByProduct.get(product.id) ?? [];
    const primary = media.find((item) => item.isPrimary);
    return {
      ...product,
      translations: translationsByProduct.get(product.id) ?? [],
      media,
      primaryImagePath: primary?.storagePath ?? null,
      imageUrl: primary ? signedUrlByPath.get(primary.storagePath) ?? null : null,
    };
  });
}

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseDatabaseReady()) {
    return [];
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, slug, name, name_nl, is_active)")
    .in("status", ["PUBLISHED"])
    .eq("is_concept", false)
    .order("sort_order");

  if (error || !data) {
    return [];
  }

  return excludeLegacyTawkProducts(
    await hydrateCatalogRelations(supabase, data.map(mapDbProduct)),
  );
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isLegacyTawkProduct({ slug })) {
    return null;
  }

  const products = await getAllProducts();
  return (
    products.find(
      (product) =>
        product.slug === slug ||
        product.translations?.some((translation) => translation.slug === slug),
    ) ?? null
  );
}

export async function getFeaturedProductsList(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.featured);
}

export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseDatabaseReady()) {
    return [];
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data) {
    return [];
  }

  return excludeLegacyTawkCategories(
    data.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      sortOrder: row.sort_order as number,
      nameNl: (row.name_nl as string | null) ?? null,
      descriptionNl: (row.description_nl as string | null) ?? null,
      imagePath: (row.image_path as string | null) ?? null,
      isActive: Boolean(row.is_active),
    })),
  );
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (isLegacyTawkCategorySlug(categorySlug)) {
    return [];
  }
  const products = await getAllProducts();
  return products.filter((p) => p.categorySlug === categorySlug);
}

/** Server-side product lookup for checkout — strikter dan publieke catalogus */
export async function getProductForCheckout(slug: string): Promise<Product | null> {
  if (isLegacyTawkProduct({ slug })) {
    return null;
  }
  const { canAddToDirectCheckout } = await import(
    "@/lib/commerce/checkout-eligibility"
  );
  const product = await getProductBySlug(slug);
  if (!product) return null;
  if (!canAddToDirectCheckout(product)) return null;
  return product;
}
