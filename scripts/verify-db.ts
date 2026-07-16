/**
 * Databaseverificatie na migratie/seed.
 * Gebruik: npm run db:verify
 */
import { createClient } from "@supabase/supabase-js";
import { categories, seedProducts } from "../src/config/products.seed";
import { loadEnvLocal, requireEnv } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();

const hasCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseSecretKey(),
);

if (!hasCredentials) {
  console.log("SKIPPED: Supabase credentials niet geconfigureerd in .env.local");
  process.exit(0);
}

requireEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
requireSupabaseSecretKey();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabaseSecretKey()!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const EXPECTED_CATEGORIES = categories.length;
const EXPECTED_PRODUCTS = seedProducts.length;

const REQUIRED_TABLES = [
  "profiles",
  "admin_roles",
  "categories",
  "products",
  "orders",
  "order_items",
  "payments",
  "leads",
  "quote_requests",
  "contact_submissions",
  "audit_logs",
  "webhook_events",
  "site_settings",
] as const;

async function verifyConnection(): Promise<boolean> {
  const { error } = await supabase.from("categories").select("id", { head: true, count: "exact" });
  if (error) {
    console.error(`FAIL databaseverbinding: ${error.message}`);
    return false;
  }
  console.log("PASS databaseverbinding");
  return true;
}

async function verifyTables(): Promise<boolean> {
  let ok = true;
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    if (error) {
      console.error(`FAIL tabel ontbreekt of onbereikbaar: ${table}`);
      ok = false;
    }
  }
  if (ok) console.log(`PASS vereiste tabellen (${REQUIRED_TABLES.length})`);
  return ok;
}

async function verify(): Promise<void> {
  let failed = false;

  if (!(await verifyConnection())) failed = true;
  if (!(await verifyTables())) failed = true;

  const { count: catCount, error: catErr } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });
  if (catErr || catCount !== EXPECTED_CATEGORIES) {
    console.error(`FAIL categorieën: verwacht ${EXPECTED_CATEGORIES}, gevonden ${catCount ?? 0}`);
    failed = true;
  } else {
    console.log(`PASS categorieën: ${catCount}`);
  }

  const { count: prodCount, error: prodErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (prodErr || prodCount !== EXPECTED_PRODUCTS) {
    console.error(`FAIL producten: verwacht ${EXPECTED_PRODUCTS}, gevonden ${prodCount ?? 0}`);
    failed = true;
  } else {
    console.log(`PASS producten: ${prodCount}`);
  }

  const { data: slugs } = await supabase.from("products").select("slug");
  const uniqueSlugs = new Set(slugs?.map((r) => r.slug));
  if (uniqueSlugs.size !== (slugs?.length ?? 0)) {
    console.error("FAIL: dubbele product-slugs gevonden");
    failed = true;
  } else {
    console.log("PASS unieke product-slugs");
  }

  const { data: billingTypes } = await supabase.from("products").select("billing_type");
  const validBilling = new Set([
    "ONE_TIME",
    "MONTHLY",
    "YEARLY",
    "QUOTE_ONLY",
    "FREE",
  ]);
  const invalidBilling = billingTypes?.filter((r) => !validBilling.has(r.billing_type));
  if (invalidBilling && invalidBilling.length > 0) {
    console.error("FAIL: ongeldige billing_type waarden gevonden");
    failed = true;
  } else {
    console.log("PASS billing_type enumwaarden");
  }

  const { data: missingPrice } = await supabase
    .from("products")
    .select("slug, price_cents, from_price_cents, billing_type")
    .not("billing_type", "in", '("QUOTE_ONLY","FREE")')
    .is("price_cents", null)
    .is("from_price_cents", null);
  if (missingPrice && missingPrice.length > 0) {
    console.error(`FAIL: betaalproducten zonder prijs: ${missingPrice.map((p) => p.slug).join(", ")}`);
    failed = true;
  } else {
    console.log("PASS prijsvalidatie (eurocenten)");
  }

  const { data: concepts } = await supabase
    .from("products")
    .select("slug, status, is_concept")
    .eq("is_concept", true)
    .eq("status", "PUBLISHED");
  if (concepts && concepts.length > 0) {
    console.error(
      `FAIL: conceptproducten gepubliceerd: ${concepts.map((c) => c.slug).join(", ")}`,
    );
    failed = true;
  } else {
    console.log("PASS conceptproducten niet commercieel gepubliceerd");
  }

  const { data: allConcepts } = await supabase
    .from("products")
    .select("slug, status, is_concept");
  const seedSlugs = new Set(seedProducts.map((p) => p.slug));
  const seedRows = allConcepts?.filter((p) => seedSlugs.has(p.slug));
  const badSeed = seedRows?.filter((p) => p.status !== "DRAFT" || !p.is_concept);
  if (badSeed && badSeed.length > 0) {
    console.error(`FAIL: seedproducten niet DRAFT/is_concept: ${badSeed.map((p) => p.slug).join(", ")}`);
    failed = true;
  } else {
    console.log("PASS seedconceptstatus (DRAFT + is_concept=true)");
  }

  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (publicKey) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: anonConcepts } = await anon
      .from("products")
      .select("slug")
      .eq("is_concept", true)
      .limit(1);
    if (anonConcepts && anonConcepts.length > 0) {
      console.error("FAIL: anon kan conceptproducten lezen (RLS-policy controleren)");
      failed = true;
    } else {
      console.log("PASS anon RLS — geen conceptproducten zichtbaar");
    }
  } else {
    console.log("SKIPPED anon RLS-check — publieke key ontbreekt");
  }

  process.exit(failed ? 1 : 0);
}

verify().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
