/**
 * Fail-closed read-only verifier: no commercial Tawk.to catalog offering.
 *
 * Usage: npm run catalog:verify-no-tawk
 * Exit: 0 PASS | 1 FAIL
 *
 * No remote writes. Does not enable checkout. Does not apply migrations.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey } from "./lib/supabase-secret";
import { isDirectCheckoutEnabled } from "../src/config/features";
import {
  containsTawkBrandMarker,
  isLegacyTawkProductSlug,
  isLegacyTawkSku,
} from "../src/lib/commerce/tawk-legacy-blocklist";
import {
  runNoTawkCatalogScan,
  type DbTawkRow,
  type TawkMatchClass,
} from "./lib/catalog-no-tawk";

loadEnvLocal();

function loadLocalDockerRows(): { rows: DbTawkRow[]; note: string } | null {
  try {
    const sql = `
SELECT kind, id, slug, name, status, internal_sku, short_description, full_description, seo_title, seo_description, is_active
FROM (
  SELECT 'product'::text AS kind, id::text, slug, name, status::text,
         NULL::text AS internal_sku, short_description, full_description,
         NULL::text AS seo_title, NULL::text AS seo_description, NULL::boolean AS is_active
  FROM products
  WHERE slug ILIKE '%tawk%' OR name ILIKE '%tawk%'
     OR COALESCE(short_description, '') ILIKE '%tawk%'
     OR COALESCE(full_description, '') ILIKE '%tawk%'
  UNION ALL
  SELECT 'category', id::text, slug, name, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  FROM categories
  WHERE slug = 'livechat' OR slug ILIKE '%tawk%' OR name ILIKE '%tawk%'
) q;
`.trim();

    const out = execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_vdbdigital2",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-F",
        "\t",
        "-c",
        sql,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );

    const rows: DbTawkRow[] = [];
    for (const line of out.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [
        kind,
        id,
        slug,
        name,
        status,
        internalSku,
        shortDescription,
        fullDescription,
        seoTitle,
        seoDescription,
        isActive,
      ] = trimmed.split("\t");
      rows.push({
        kind: kind as DbTawkRow["kind"],
        id: id || undefined,
        slug: slug === "" ? null : slug,
        name: name === "" ? null : name,
        status: status === "" ? null : status,
        internalSku: internalSku === "" ? null : internalSku,
        shortDescription: shortDescription === "" ? null : shortDescription,
        fullDescription: fullDescription === "" ? null : fullDescription,
        seoTitle: seoTitle === "" ? null : seoTitle,
        seoDescription: seoDescription === "" ? null : seoDescription,
        isActive:
          isActive === "" || isActive == null
            ? null
            : isActive === "t" || isActive === "true",
      });
    }

    return {
      rows,
      note: `READ-ONLY local Docker DB (supabase_db_vdbdigital2) hits=${rows.length} (no writes)`,
    };
  } catch {
    return null;
  }
}

async function loadDbRowsReadOnly(): Promise<{
  rows: DbTawkRow[];
  note: string;
}> {
  // Prefer local Docker (no remote dependency; migration applied locally only).
  const local = loadLocalDockerRows();
  if (local) return local;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  if (!url || !key) {
    return {
      rows: [],
      note: "SKIP DB — no local Docker and no Supabase credentials (repo/config scan only)",
    };
  }

  // Remote/env URL: read-only only. Never write.

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: DbTawkRow[] = [];

  // Prefer extended catalog columns; fall back when migration not applied.
  let products: Record<string, unknown>[] | null = null;
  let pErrMsg: string | null = null;

  {
    const extended = await supabase
      .from("products")
      .select(
        "id, slug, name, status, internal_sku, short_description, full_description, seo_title, seo_description",
      )
      .limit(5000);
    if (!extended.error) {
      products = (extended.data as Record<string, unknown>[]) ?? [];
    } else {
      const basic = await supabase
        .from("products")
        .select("id, slug, name, status, short_description, full_description")
        .limit(5000);
      if (basic.error) {
        pErrMsg = basic.error.message;
      } else {
        products = (basic.data as Record<string, unknown>[]) ?? [];
        pErrMsg = `partial columns (extended catalog missing: ${extended.error.message})`;
      }
    }
  }

  if (!products) {
    return {
      rows: [],
      note: `SKIP DB products — ${pErrMsg ?? "unknown"}`,
    };
  }

  for (const p of products) {
    const hit =
      isLegacyTawkProductSlug(p.slug as string) ||
      isLegacyTawkSku((p.internal_sku as string | null | undefined) ?? null) ||
      containsTawkBrandMarker(p.name as string) ||
      containsTawkBrandMarker(p.short_description as string) ||
      containsTawkBrandMarker(p.full_description as string) ||
      containsTawkBrandMarker((p.seo_title as string | null | undefined) ?? null) ||
      containsTawkBrandMarker(
        (p.seo_description as string | null | undefined) ?? null,
      );
    if (!hit) continue;
    rows.push({
      kind: "product",
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      status: p.status as string,
      internalSku: (p.internal_sku as string | null | undefined) ?? null,
      shortDescription: (p.short_description as string | null) ?? null,
      fullDescription: (p.full_description as string | null) ?? null,
      seoTitle: (p.seo_title as string | null | undefined) ?? null,
      seoDescription: (p.seo_description as string | null | undefined) ?? null,
    });
  }

  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug, name")
    .limit(2000);
  for (const c of cats ?? []) {
    if (
      isLegacyTawkProductSlug(c.slug as string) ||
      containsTawkBrandMarker(c.name as string) ||
      (c.slug as string)?.toLowerCase() === "livechat"
    ) {
      rows.push({
        kind: "category",
        id: c.id as string,
        slug: c.slug as string,
        name: c.name as string,
      });
    }
  }

  const { data: addons } = await supabase
    .from("product_addons")
    .select("id, slug, name, description, is_active")
    .limit(2000);
  for (const a of addons ?? []) {
    if (
      isLegacyTawkProductSlug(a.slug as string) ||
      containsTawkBrandMarker(a.name as string) ||
      containsTawkBrandMarker(a.description as string)
    ) {
      rows.push({
        kind: "addon",
        id: a.id as string,
        slug: a.slug as string,
        name: a.name as string,
        shortDescription: (a.description as string | null) ?? null,
        isActive: (a.is_active as boolean | null) ?? null,
      });
    }
  }

  const { data: translations } = await supabase
    .from("product_translations")
    .select("product_id, locale, name, short_description, full_description, seo_title, seo_description")
    .limit(5000);
  for (const t of translations ?? []) {
    const hit =
      containsTawkBrandMarker(t.name as string) ||
      containsTawkBrandMarker(t.short_description as string) ||
      containsTawkBrandMarker(t.full_description as string) ||
      containsTawkBrandMarker(t.seo_title as string) ||
      containsTawkBrandMarker(t.seo_description as string);
    if (!hit) continue;
    rows.push({
      kind: "translation",
      id: t.product_id as string,
      name: t.name as string,
      shortDescription: (t.short_description as string | null) ?? null,
      fullDescription: (t.full_description as string | null) ?? null,
      seoTitle: (t.seo_title as string | null) ?? null,
      seoDescription: (t.seo_description as string | null) ?? null,
      status: "PUBLISHED",
    });
  }

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  })();

  const columnNote = pErrMsg ? `; ${pErrMsg}` : "";

  return {
    rows,
    note: `READ-ONLY DB scan host=${host} hits=${rows.length}${columnNote} (no writes)`,
  };
}

async function main(): Promise<void> {
  console.log("=== Catalog verify: no Tawk offering (read-only, fail-closed) ===");
  console.log(`CHECKOUT_ENABLED effective: ${isDirectCheckoutEnabled()}`);
  console.log(
    `P05_MIGRATION_APPLIED: ${process.env.P05_MIGRATION_APPLIED ?? "(unset)"}`,
  );

  if (isDirectCheckoutEnabled()) {
    console.log("\nRESULT: FAIL — active or commercial Tawk reference found");
    console.log("Detail: CHECKOUT_ENABLED must remain false during this gate");
    process.exit(1);
  }

  const { rows: dbRows, note: dbNote } = await loadDbRowsReadOnly();
  console.log(`DB: ${dbNote}`);

  const { matches, blockers, allowed } = runNoTawkCatalogScan({ dbRows });

  const counts = new Map<TawkMatchClass, number>();
  for (const m of matches) {
    counts.set(m.classification, (counts.get(m.classification) ?? 0) + 1);
  }

  console.log("\nClassification counts:");
  for (const [k, v] of [...counts.entries()].sort()) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\nAllowed (non-blocking) matches:");
  if (allowed.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of allowed.slice(0, 80)) {
      console.log(`  [${m.classification}] ${m.path} — ${m.detail}`);
    }
    if (allowed.length > 80) console.log(`  … +${allowed.length - 80} more`);
  }

  console.log("\nBlockers:");
  if (blockers.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of blockers) {
      console.log(`  [${m.classification}] ${m.path} — ${m.detail}`);
    }
  }

  if (blockers.length > 0) {
    console.log("\nRESULT: FAIL — active or commercial Tawk reference found");
    process.exit(1);
  }

  console.log("\nRESULT: PASS — no Tawk catalog offering exists");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  console.log("\nRESULT: FAIL — active or commercial Tawk reference found");
  process.exit(1);
});
