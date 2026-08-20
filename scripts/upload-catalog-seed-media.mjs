import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_ID = "10000000-0000-4000-8000-000000000100";
const STORAGE_PATH = `${PRODUCT_ID}/tv-streaming-yearly.png`;
const BUCKET = "product-media";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} ontbreekt`);
  return value;
}

function assertSafeTarget(url) {
  const target = required("CATALOG_MEDIA_TARGET");
  if (!process.argv.includes("--confirm-upload")) {
    throw new Error("Gebruik --confirm-upload na controle van het doelproject");
  }
  const host = new URL(url).hostname;
  if (target === "local") {
    if (host !== "127.0.0.1" && host !== "localhost") {
      throw new Error("CATALOG_MEDIA_TARGET=local vereist een lokale Supabase-URL");
    }
    return;
  }
  if (target !== "staging") {
    throw new Error("Alleen local of staging is toegestaan; productie-upload is geblokkeerd");
  }
  const expectedRef = required("EXPECTED_STAGING_PROJECT_REF");
  const actualRef = host.split(".")[0];
  if (actualRef !== expectedRef) {
    throw new Error(`Project-ref mismatch: verwacht ${expectedRef}, kreeg ${actualRef}`);
  }
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
assertSafeTarget(supabaseUrl);
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(scriptDir, "../assets/catalog-seed/tv-streaming-yearly.png");
const bytes = await readFile(filePath);

const { error: uploadError } = await supabase.storage.from(BUCKET).upload(STORAGE_PATH, bytes, {
  contentType: "image/png",
  cacheControl: "31536000",
  upsert: false,
});
if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) {
  throw uploadError;
}

const { error: mediaError } = await supabase.from("product_media").upsert(
  {
    product_id: PRODUCT_ID,
    storage_path: STORAGE_PATH,
    mime_type: "image/png",
    byte_size: bytes.byteLength,
    width: 1536,
    height: 1024,
    sort_order: 0,
    is_primary: true,
    alt_text_nl: "Moderne woonkamer met televisie waarop een generieke streaminginterface zichtbaar is",
    alt_text_en: "Modern living room with a television showing a generic streaming interface",
  },
  { onConflict: "storage_path" },
);
if (mediaError) throw mediaError;

const { error: demoteError } = await supabase
  .from("product_media")
  .update({ is_primary: false })
  .eq("product_id", PRODUCT_ID)
  .neq("storage_path", STORAGE_PATH);
if (demoteError) throw demoteError;

const { error: productError } = await supabase
  .from("products")
  .update({ primary_image_path: STORAGE_PATH })
  .eq("id", PRODUCT_ID);
if (productError) throw productError;

console.log(
  JSON.stringify({
    ok: true,
    target: process.env.CATALOG_MEDIA_TARGET,
    productId: PRODUCT_ID,
    storagePath: STORAGE_PATH,
    activated: false,
  }),
);
