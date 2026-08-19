import "server-only";
import type { Product } from "@/types";
import {
  isBlockedPublicShopSlug,
  isPublicShopProduct,
} from "@/lib/commerce/public-shop-gates";
import {
  getAllCategories,
  getAllProducts,
} from "@/server/repositories/products";

export {
  isPublicShopProduct,
  publicShopCtaLabel,
  publicShopPriceDisplay,
} from "@/lib/commerce/public-shop-gates";

const PAGE_SIZE = 12;

export type PublicShopCategory = {
  slug: string;
  name: string;
  count: number;
};

export type PublicShopQuery = {
  q?: string;
  category?: string | "all";
  page?: number;
  pageSize?: number;
};

export type PublicShopPageResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: PublicShopCategory[];
  allCount: number;
};

export async function listPublicShopProducts(): Promise<Product[]> {
  const products = await getAllProducts();
  return products
    .filter(isPublicShopProduct)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name, "nl"),
    );
}

export async function getPublicShopProductBySlug(
  slug: string,
): Promise<Product | null> {
  if (isBlockedPublicShopSlug(slug)) return null;
  const products = await listPublicShopProducts();
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getAllPublicShopSlugs(): Promise<string[]> {
  const products = await listPublicShopProducts();
  return products.map((p) => p.slug);
}

export async function queryPublicShopCatalog(
  query: PublicShopQuery = {},
): Promise<PublicShopPageResult> {
  const pageSize = Math.min(Math.max(query.pageSize ?? PAGE_SIZE, 1), 24);
  const page = Math.max(query.page ?? 1, 1);
  const q = (query.q ?? "").trim().toLowerCase();
  const category = query.category ?? "all";

  const [products, allCategories] = await Promise.all([
    listPublicShopProducts(),
    getAllCategories(),
  ]);

  const countBySlug = new Map<string, number>();
  for (const product of products) {
    if (!product.categorySlug) continue;
    countBySlug.set(
      product.categorySlug,
      (countBySlug.get(product.categorySlug) ?? 0) + 1,
    );
  }

  const categories: PublicShopCategory[] = allCategories
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      count: countBySlug.get(c.slug) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "nl"));

  let filtered = products;
  if (category !== "all") {
    filtered = filtered.filter((p) => p.categorySlug === category);
  }
  if (q) {
    filtered = filtered.filter((p) => {
      const hay = [
        p.name,
        p.shortDescription,
        p.categoryName,
        p.slug,
        ...(p.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    categories,
    allCount: products.length,
  };
}

export { PAGE_SIZE as PUBLIC_SHOP_PAGE_SIZE };
