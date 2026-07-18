/**
 * Read-only dual-catalog alignment report (shop seed/config vs commercial config).
 * Usage: npm run catalog:verify-alignment
 * Exit: 0 PASS | 1 FAIL (blockers)
 */
import { loadEnvLocal } from "./lib/env-loader";
import { seedProducts } from "../src/config/products.seed";
import { isDirectCheckoutEnabled } from "../src/config/features";
import { runAlignmentReport, type AlignmentClass } from "./lib/catalog-alignment";

loadEnvLocal();

async function main(): Promise<void> {
  console.log("=== Catalog dual-catalog alignment (read-only) ===");
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  if (isDirectCheckoutEnabled()) {
    console.log("FAIL — CHECKOUT_ENABLED must remain false during hygiene");
    process.exit(1);
  }

  const { rows, blockers } = runAlignmentReport(seedProducts);

  const counts = new Map<AlignmentClass, number>();
  for (const r of rows) {
    counts.set(r.classification, (counts.get(r.classification) ?? 0) + 1);
  }

  console.log("\nClassification counts:");
  for (const [k, v] of [...counts.entries()].sort()) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\nBlockers:");
  if (blockers.length === 0) {
    console.log("  (none)");
  } else {
    for (const b of blockers.slice(0, 50)) {
      console.log(
        `  ${b.classification} shop=${b.shopSlug ?? "—"} commercial=${b.commercialSlug ?? "—"} — ${b.detail}`,
      );
    }
    if (blockers.length > 50) console.log(`  … +${blockers.length - 50} more`);
  }

  console.log("\nStable-key recommendation:");
  console.log(
    "  Prefer linking legal/commercial approval to immutable product id or internal_sku,",
  );
  console.log(
    "  not marketing slug. Implement via forward-only migration + mapping table later;",
  );
  console.log("  do not break slug-based lookup without a dedicated gate.");

  const hardBlockers = blockers.filter((b) =>
    ["DUPLICATE_SKU", "DUPLICATE_SLUG"].includes(b.classification),
  );

  const checkoutEligibleUnmapped = blockers.filter((b) => {
    if (b.classification !== "MISSING_COMMERCIAL_MAPPING" || !b.shopSlug) {
      return false;
    }
    const p = seedProducts.find((x) => x.slug === b.shopSlug);
    if (!p) return false;
    return (
      isDirectCheckoutEnabled() &&
      p.status === "PUBLISHED" &&
      p.billingType === "ONE_TIME" &&
      p.priceCents !== null &&
      p.priceCents > 0 &&
      (p.fromPriceCents === null || p.fromPriceCents === undefined)
    );
  });

  const publishedUnmapped = blockers.filter(
    (b) =>
      b.classification === "MISSING_COMMERCIAL_MAPPING" &&
      seedProducts.some((p) => p.slug === b.shopSlug && p.status === "PUBLISHED"),
  );

  console.log(
    `\nInformational: ${publishedUnmapped.length} published shop products lack commercial slug mapping (known dual-catalog debt).`,
  );

  if (hardBlockers.length > 0 || checkoutEligibleUnmapped.length > 0) {
    console.log(
      `\nRESULT: FAIL — ${hardBlockers.length} duplicate blockers, ${checkoutEligibleUnmapped.length} checkout-eligible-unmapped`,
    );
    process.exit(1);
  }

  console.log(
    "\nRESULT: PASS — no duplicate SKU/slug blockers; no checkout-eligible unmapped products",
  );
  console.log(
    "Note: MISSING_COMMERCIAL_MAPPING / MISSING_SHOP_PRODUCT counts are informational until slug/SKU alignment migration.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAIL — alignment error");
  console.error(err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
