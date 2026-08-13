/**
 * Staging-only catalog matrix seed (cohort 86 → 11 eligible / 75 hidden).
 * Target: qzekuvmgfekzsowdecyk. Never production. Never prints tokens.
 *
 * Usage: node --experimental-strip-types scripts/staging-catalog-matrix-seed.mjs
 * or:    npx tsx scripts/staging-catalog-matrix-seed.mjs
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STAGING = "qzekuvmgfekzsowdecyk";
const PROD = "nhsrdnjfsxfikfbdmdfj";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = path.join(
  ROOT,
  "docs/evidence/prod-promotion/public-website-visual-recovery/catalog-approval",
);

function getToken() {
  const ps1 = path.join(
    ROOT,
    "docs/evidence/staging-rc3-apply/.vault/_cred_read.ps1",
  );
  return execFileSync("powershell.exe", ["-NoProfile", "-File", ps1], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function api(token, method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
              }
            : {}),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: d }));
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function assertStaging(token) {
  const r = await api(token, "GET", `/v1/projects/${STAGING}`);
  if (r.status !== 200) throw new Error(`identity_${r.status}`);
  const j = JSON.parse(r.body);
  if (j.id !== STAGING) throw new Error("target_gate_fail");
  if (j.id === PROD) throw new Error("production_denylist");
  if (j.name !== "VDB Digital Staging") throw new Error("name_mismatch");
  return j;
}

async function sql(token, query) {
  await assertStaging(token);
  const r = await api(token, "POST", `/v1/projects/${STAGING}/database/query`, {
    query,
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`SQL_${r.status}:${r.body.slice(0, 800)}`);
  }
  return JSON.parse(r.body);
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const APPROVED = [
  {
    slug: "onepage-website",
    name: "Onepage Website",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "STARTING_FROM",
    fromCents: 99500,
    priceCents: null,
    cat: "websites",
    b2c: true,
  },
  {
    slug: "launch-website",
    name: "Launch Website",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "STARTING_FROM",
    fromCents: 169500,
    priceCents: null,
    cat: "websites",
    b2c: true,
  },
  {
    slug: "growth-website",
    name: "Growth Website",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "STARTING_FROM",
    fromCents: 299500,
    priceCents: null,
    cat: "websites",
    b2c: true,
  },
  {
    slug: "webshop-launch",
    name: "Webshop Launch",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "STARTING_FROM",
    fromCents: 399500,
    priceCents: null,
    cat: "webshops",
    b2c: true,
  },
  {
    slug: "business-growth-system",
    name: "Business Growth System",
    legal: "APPROVED_FOR_B2B",
    priceMode: "STARTING_FROM",
    fromCents: 349500,
    priceCents: null,
    cat: "packages",
    b2c: false,
  },
  {
    slug: "essential-care",
    name: "Essential Care",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "FIXED",
    fromCents: null,
    priceCents: 6900,
    cat: "hosting-onderhoud",
    b2c: true,
  },
  {
    slug: "business-care",
    name: "Business Care",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "FIXED",
    fromCents: null,
    priceCents: 12900,
    cat: "hosting-onderhoud",
    b2c: true,
  },
  {
    slug: "growth-care",
    name: "Growth Care",
    legal: "APPROVED_FOR_B2B",
    priceMode: "FIXED",
    fromCents: null,
    priceCents: 24900,
    cat: "hosting-onderhoud",
    b2c: false,
  },
  {
    slug: "custom-website",
    name: "Custom Website",
    legal: "APPROVED_FOR_BOTH",
    priceMode: "QUOTE_ONLY",
    fromCents: 500000,
    priceCents: null,
    cat: "websites",
    b2c: true,
  },
  {
    slug: "digital-partner",
    name: "Digital Partner",
    legal: "APPROVED_FOR_B2B",
    priceMode: "QUOTE_ONLY",
    fromCents: 50000,
    priceCents: null,
    cat: "hosting-onderhoud",
    b2c: false,
  },
  {
    slug: "automation-system",
    name: "Automation System",
    legal: "APPROVED_FOR_B2B",
    priceMode: "QUOTE_ONLY",
    fromCents: null,
    priceCents: null,
    cat: "ai-automatisering",
    b2c: false,
  },
];

const DUPLICATES = [
  "website-launch-system",
  "webshop-launch-system",
  "digital-partner-system",
];

function loadSoftwareSlugs() {
  const j = JSON.parse(
    readFileSync(path.join(EVIDENCE, "software-slugs.json"), "utf8"),
  );
  if (j.count !== 72 || j.slugs.length !== 72) {
    throw new Error(`software_slug_count:${j.count}`);
  }
  return j.slugs;
}

async function ensureCategories(token) {
  const cats = [
    ["websites", "Websites"],
    ["webshops", "Webshops"],
    ["packages", "Packages"],
    ["hosting-onderhoud", "Hosting & onderhoud"],
    ["ai-automatisering", "AI & automatisering"],
    ["software-licenties", "Softwarelicenties"],
  ];
  for (const [slug, name] of cats) {
    await sql(
      token,
      `INSERT INTO public.categories (id, slug, name, description, sort_order)
       VALUES (gen_random_uuid(), '${esc(slug)}', '${esc(name)}', '${esc(name)}', 100)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug`,
    );
  }
}

function approvedSql(p) {
  const priceMode = p.priceMode;
  const priceCents = p.priceCents === null ? "NULL" : String(p.priceCents);
  const fromCents = p.fromCents === null ? "NULL" : String(p.fromCents);
  const commissionType =
    priceMode === "QUOTE_ONLY" ? "manual_quote" : "manual_quote";
  return `
INSERT INTO public.products (
  slug, name, short_description, full_description, category_id,
  price_cents, from_price_cents, currency, vat_percent, billing_type,
  status, price_mode, price_includes_vat, price_label, price_status, legal_status,
  publication_ready, audience_b2b, audience_b2c, is_concept, delivery_time,
  primary_image_path, sort_order,
  partner_enabled, partner_visibility, partner_availability,
  partner_commission_type, partner_commission_status, partner_requires_approval
)
SELECT
  '${esc(p.slug)}', '${esc(p.name)}',
  'Staging synthetic — ${esc(p.name)}',
  'Staging synthetic product for catalog preview validation. No production customer data.',
  c.id,
  ${priceCents}, ${fromCents}, 'EUR', 21, 'ONE_TIME',
  'PUBLISHED', '${priceMode}', false,
  ${priceMode === "QUOTE_ONLY" ? "'Op aanvraag'" : priceMode === "STARTING_FROM" ? "'Vanaf'" : "NULL"},
  'APPROVED', '${p.legal}',
  true, true, ${p.b2c ? "true" : "false"}, false, 'Op afspraak',
  '/products/packages/bundle.svg', 10,
  true, 'all_active', 'available',
  '${commissionType}', 'draft', true
FROM public.categories c WHERE c.slug = '${esc(p.cat)}'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  legal_status = EXCLUDED.legal_status,
  price_status = EXCLUDED.price_status,
  price_mode = EXCLUDED.price_mode,
  price_cents = EXCLUDED.price_cents,
  from_price_cents = EXCLUDED.from_price_cents,
  publication_ready = true,
  is_concept = false,
  partner_enabled = true,
  partner_visibility = 'all_active',
  partner_availability = 'available',
  partner_commission_type = EXCLUDED.partner_commission_type,
  partner_commission_status = 'draft',
  primary_image_path = EXCLUDED.primary_image_path,
  updated_at = NOW();
`;
}

function hiddenSql(slug, name, categorySlug, note) {
  return `
INSERT INTO public.products (
  slug, name, short_description, full_description, category_id,
  price_cents, from_price_cents, currency, vat_percent, billing_type,
  status, price_mode, price_includes_vat, price_status, legal_status,
  publication_ready, audience_b2b, audience_b2c, is_concept,
  primary_image_path, sort_order, legal_internal_note,
  partner_enabled, partner_visibility, partner_availability,
  partner_commission_status
)
SELECT
  '${esc(slug)}', '${esc(name)}',
  'Staging synthetic hidden — ${esc(note)}',
  'Hidden staging catalog row. Not for public or partner sale.',
  c.id,
  NULL, NULL, 'EUR', 21, 'ONE_TIME',
  'HIDDEN', 'QUOTE_ONLY', false, 'DRAFT', 'LEGAL_REVIEW_REQUIRED',
  false, true, true, false,
  '/products/packages/bundle.svg', 900, '${esc(note)}',
  false, 'none', 'paused', 'draft'
FROM public.categories c WHERE c.slug = '${esc(categorySlug)}'
ON CONFLICT (slug) DO UPDATE SET
  status = 'HIDDEN',
  legal_status = 'LEGAL_REVIEW_REQUIRED',
  price_status = 'DRAFT',
  publication_ready = false,
  partner_enabled = false,
  partner_visibility = 'none',
  partner_availability = 'paused',
  is_concept = false,
  updated_at = NOW();
`;
}

async function main() {
  const token = getToken();
  if (!token) throw new Error("no_token");
  await assertStaging(token);

  const hasPartner = await sql(
    token,
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='products' AND column_name='partner_enabled'
     ) AS ok`,
  );
  if (!hasPartner?.[0]?.ok && !hasPartner?.ok) {
    // Management API may return array or object depending on version
    const row = Array.isArray(hasPartner) ? hasPartner[0] : hasPartner;
    if (!row?.ok) throw new Error("partner_enabled_missing_apply_migration_first");
  }

  await ensureCategories(token);

  for (const p of APPROVED) {
    await sql(token, approvedSql(p));
  }
  for (const slug of DUPLICATES) {
    await sql(
      token,
      hiddenSql(slug, slug, "packages", "DUPLICATE_HIDDEN"),
    );
  }
  const software = loadSoftwareSlugs();
  for (const slug of software) {
    await sql(
      token,
      hiddenSql(slug, slug, "software-licenties", "REQUIRES_LICENSE_EVIDENCE"),
    );
  }

  const matrix = await sql(
    token,
    `SELECT
      (SELECT count(*)::int FROM products) AS total,
      (SELECT count(*)::int FROM products WHERE status='PUBLISHED' AND publication_ready AND price_status='APPROVED'
        AND legal_status::text IN ('APPROVED_FOR_B2B','APPROVED_FOR_BOTH','APPROVED_FOR_B2C')) AS public_eligible,
      (SELECT count(*)::int FROM products WHERE partner_enabled AND status='PUBLISHED' AND publication_ready
        AND price_status='APPROVED' AND legal_status::text IN ('APPROVED_FOR_B2B','APPROVED_FOR_BOTH','APPROVED_FOR_B2C')) AS partner_enabled,
      (SELECT count(*)::int FROM products WHERE status='HIDDEN' AND legal_status::text='LEGAL_REVIEW_REQUIRED'
        AND slug NOT IN ('website-launch-system','webshop-launch-system','digital-partner-system')) AS hidden_software,
      (SELECT count(*)::int FROM products WHERE slug IN ('website-launch-system','webshop-launch-system','digital-partner-system')) AS hidden_duplicates`,
  );

  mkdirSync(EVIDENCE, { recursive: true });
  const out = {
    target: STAGING,
    at: new Date().toISOString(),
    matrix: Array.isArray(matrix) ? matrix[0] : matrix,
    sha256_script: createHash("sha256")
      .update(readFileSync(fileURLToPath(import.meta.url)))
      .digest("hex"),
  };
  writeFileSync(
    path.join(EVIDENCE, "staging-catalog-matrix-seed-result.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(JSON.stringify(out.matrix));
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
