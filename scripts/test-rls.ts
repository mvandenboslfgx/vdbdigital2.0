/**
 * Live RLS-tests — anon/publishable client vs. service role setup.
 * Gebruik: npm run db:test-rls
 *
 * Maakt tijdelijke testproducten met slug-prefix `rls-test-` en ruimt die op.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/env-loader";
import { getSupabaseSecretKey, requireSupabaseSecretKey } from "./lib/supabase-secret";

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = getSupabaseSecretKey();

if (!supabaseUrl || !publicKey || !secretKey) {
  console.log("SKIPPED: Supabase credentials niet volledig geconfigureerd");
  process.exit(0);
}

requireSupabaseSecretKey();

const anon = createClient(supabaseUrl, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const service = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_PREFIX = "rls-test-";
const SLUGS = {
  publishedLive: `${TEST_PREFIX}published-live`,
  publishedConcept: `${TEST_PREFIX}published-concept`,
  draftLive: `${TEST_PREFIX}draft-live`,
} as const;

let categoryId: string | null = null;
let failed = false;

function pass(label: string): void {
  console.log(`PASS ${label}`);
}

function fail(label: string, detail?: string): void {
  failed = true;
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
}

async function expectError(
  label: string,
  action: () => Promise<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<void> {
  const { data, error } = await action();
  if (!error && data !== null && (Array.isArray(data) ? data.length > 0 : true)) {
    fail(label, "verwacht geweigerd of leeg");
    return;
  }
  pass(label);
}

async function setup(): Promise<void> {
  const { data: category, error } = await service
    .from("categories")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error || !category) {
    throw new Error(
      "Geen categorieën gevonden — voer eerst npm run db:seed uit na migrations",
    );
  }
  categoryId = category.id;

  await service.from("products").delete().like("slug", `${TEST_PREFIX}%`);

  const rows = [
    {
      slug: SLUGS.publishedLive,
      name: "RLS test published live",
      short_description: "test",
      full_description: "test",
      category_id: categoryId,
      price_cents: 100,
      billing_type: "ONE_TIME",
      status: "PUBLISHED",
      is_concept: false,
    },
    {
      slug: SLUGS.publishedConcept,
      name: "RLS test published concept",
      short_description: "test",
      full_description: "test",
      category_id: categoryId,
      price_cents: 100,
      billing_type: "ONE_TIME",
      status: "PUBLISHED",
      is_concept: true,
    },
    {
      slug: SLUGS.draftLive,
      name: "RLS test draft",
      short_description: "test",
      full_description: "test",
      category_id: categoryId,
      price_cents: 100,
      billing_type: "ONE_TIME",
      status: "DRAFT",
      is_concept: false,
    },
  ];

  const { error: insertErr } = await service.from("products").insert(rows);
  if (insertErr) {
    throw new Error(`Testdata setup mislukt: ${insertErr.message}`);
  }
}

async function cleanup(): Promise<void> {
  await service.from("products").delete().like("slug", `${TEST_PREFIX}%`);
}

async function testPublicProductReads(): Promise<void> {
  const { data: live } = await anon
    .from("products")
    .select("slug")
    .eq("slug", SLUGS.publishedLive)
    .maybeSingle();

  if (live?.slug === SLUGS.publishedLive) {
    pass("anon kan gepubliceerd niet-concept product lezen");
  } else {
    fail("anon kan gepubliceerd niet-concept product lezen");
  }

  const { data: concept } = await anon
    .from("products")
    .select("slug")
    .eq("slug", SLUGS.publishedConcept)
    .maybeSingle();

  if (!concept) {
    pass("anon kan conceptproduct niet lezen");
  } else {
    fail("anon kan conceptproduct niet lezen");
  }

  const { data: draft } = await anon
    .from("products")
    .select("slug")
    .eq("slug", SLUGS.draftLive)
    .maybeSingle();

  if (!draft) {
    pass("anon kan ongepubliceerd product niet lezen");
  } else {
    fail("anon kan ongepubliceerd product niet lezen");
  }
}

async function testDenyWrites(client: SupabaseClient, label: string): Promise<void> {
  await expectError(`${label} — product insert`, async () =>
    client.from("products").insert({
      slug: `${TEST_PREFIX}insert-attempt`,
      name: "x",
      short_description: "x",
      full_description: "x",
      billing_type: "ONE_TIME",
    }),
  );

  await expectError(`${label} — product price update`, async () =>
    client
      .from("products")
      .update({ price_cents: 1 })
      .eq("slug", SLUGS.publishedLive)
      .select(),
  );
}

async function testDenySensitiveReads(): Promise<void> {
  const tables = [
    "orders",
    "payments",
    "leads",
    "contact_submissions",
    "audit_logs",
    "admin_roles",
    "site_settings",
  ] as const;

  for (const table of tables) {
    await expectError(`anon — ${table} read`, async () =>
      anon.from(table).select("*").limit(1),
    );
  }
}

async function testPaymentWriteDenied(): Promise<void> {
  await expectError("anon — payments update", async () =>
    anon.from("payments").update({ status: "PAID" }).neq("id", "00000000-0000-0000-0000-000000000000"),
  );
}

async function main(): Promise<void> {
  try {
    await setup();
    await testPublicProductReads();
    await testDenyWrites(anon, "anon");
    await testDenySensitiveReads();
    await testPaymentWriteDenied();
  } finally {
    await cleanup();
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
