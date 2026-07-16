/**
 * Idempotente productseed — upsert op slug.
 * Conceptproducten worden als DRAFT + is_concept=true opgeslagen.
 *
 * Gebruik: npm run db:seed
 */
import { createClient } from "@supabase/supabase-js";
import { categories, seedProducts } from "../src/config/products.seed";
import { loadEnvLocal, requireEnv } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
requireSupabaseSecretKey();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabaseSecretKey()!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function seedCategories(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const cat of categories) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        {
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          sort_order: cat.sortOrder,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error) {
      throw new Error(`Categorie ${cat.slug}: ${error.message}`);
    }
    slugToId.set(data.slug, data.id);
  }

  return slugToId;
}

async function seedProductRows(categoryMap: Map<string, string>): Promise<void> {
  for (const product of seedProducts) {
    const categoryId = categoryMap.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Onbekende categorie voor product ${product.slug}`);
    }

    const { error } = await supabase.from("products").upsert(
      {
        slug: product.slug,
        name: product.name,
        short_description: product.shortDescription,
        full_description: product.fullDescription,
        category_id: categoryId,
        price_cents: product.priceCents,
        from_price_cents: product.fromPriceCents,
        billing_type: product.billingType,
        delivery_time: product.deliveryTime,
        included_items: product.includedItems,
        excluded_items: product.excludedItems,
        extensions: product.extensions,
        target_audience: product.targetAudience,
        workflow: product.workflow,
        required_input: product.requiredInput,
        status: "DRAFT",
        is_concept: true,
        featured: product.featured,
        sort_order: product.sortOrder,
        seo_title: product.seoTitle,
        seo_description: product.seoDescription,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );

    if (error) {
      throw new Error(`Product ${product.slug}: ${error.message}`);
    }
  }
}

async function main() {
  console.log("Start seed…");
  const categoryMap = await seedCategories();
  console.log(`✓ ${categoryMap.size} categorieën`);
  await seedProductRows(categoryMap);
  console.log(`✓ ${seedProducts.length} producten (DRAFT, is_concept=true)`);
  console.log("Seed voltooid. Publiceer producten handmatig via admin na prijscontrole.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
