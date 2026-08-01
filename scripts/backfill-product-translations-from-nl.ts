/**
 * OPTIONAL Phase 4 seed helper: backfill product_translations(locale='nl')
 * rows from the static src/i18n/content/products-nl.ts overlay, so the
 * catalog admin has a NL starting point to review in the new workflow.
 *
 * SAFETY:
 * - Dry-run by default. Nothing is written unless --execute is passed.
 * - Refuses to write to anything that isn't a local Supabase instance
 *   (hostname must be localhost/127.0.0.1). This script must NEVER be run
 *   against staging/production — see task constraints.
 * - Always upserts with status = 'needs_review' — never 'published'.
 *   machine_translated/needs_review rows never auto-publish to the storefront
 *   (see supabase/migrations/20260801140000_product_translation_status.sql).
 * - Requires the Phase 4 migration to be applied locally first (status column).
 *
 * Usage:
 *   npx tsx scripts/backfill-product-translations-from-nl.ts            (dry run — prints plan only)
 *   npx tsx scripts/backfill-product-translations-from-nl.ts --execute  (writes to LOCAL db only)
 */
import { createClient } from "@supabase/supabase-js";
import { productsNl } from "../src/i18n/content/products-nl";
import { loadEnvLocal, requireEnv } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
requireSupabaseSecretKey();

const EXECUTE = process.argv.includes("--execute");

function assertLocalOnly(url: string): void {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocal) {
    console.error(
      `REFUSED: NEXT_PUBLIC_SUPABASE_URL host "${hostname}" is not local (localhost/127.0.0.1).`,
    );
    console.error(
      "This script must never run against staging/production. Aborting without writing anything.",
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (EXECUTE) {
    assertLocalOnly(url);
  }

  const supabase = createClient(url, getSupabaseSecretKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const slugs = Object.keys(productsNl);
  console.log(
    `=== Backfill product_translations(nl) from products-nl.ts — ${EXECUTE ? "EXECUTE" : "DRY RUN"} ===`,
  );
  console.log(`Candidate slugs: ${slugs.length}`);

  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", slugs);

  if (error) {
    console.error(`Failed to load products: ${error.message}`);
    process.exit(1);
  }

  const idBySlug = new Map((products ?? []).map((p) => [p.slug as string, p.id as string]));

  let planned = 0;
  let skippedNoProduct = 0;
  let written = 0;
  let failed = 0;

  for (const slug of slugs) {
    const productId = idBySlug.get(slug);
    if (!productId) {
      skippedNoProduct += 1;
      console.log(`  SKIP  ${slug} — no matching products row (base product not found)`);
      continue;
    }

    const overlay = productsNl[slug];
    const row = {
      product_id: productId,
      locale: "nl" as const,
      name: overlay.name,
      short_description: overlay.shortDescription,
      full_description: overlay.fullDescription,
      included_items: overlay.includedItems,
      excluded_items: overlay.excludedItems,
      seo_title: overlay.seoTitle,
      seo_description: overlay.seoDescription,
      delivery_time: overlay.deliveryTime,
      target_audience: overlay.targetAudience,
      workflow: overlay.workflow,
      // Never seeded as published/approved — a human must promote this.
      status: "needs_review" as const,
      updated_at: new Date().toISOString(),
    };

    planned += 1;
    console.log(`  PLAN  ${slug} -> product_translations(product_id=${productId}, locale=nl, status=needs_review)`);

    if (!EXECUTE) continue;

    const { error: upsertError } = await supabase
      .from("product_translations")
      .upsert(row, { onConflict: "product_id,locale" });

    if (upsertError) {
      failed += 1;
      console.error(`    FAILED: ${upsertError.message}`);
    } else {
      written += 1;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Planned: ${planned}`);
  console.log(`Skipped (no base product): ${skippedNoProduct}`);
  if (EXECUTE) {
    console.log(`Written: ${written}`);
    console.log(`Failed: ${failed}`);
    if (failed > 0) process.exit(1);
  } else {
    console.log("Nothing written — dry run. Re-run with --execute against a LOCAL db to apply.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
