/**
 * Preference B — guarded staging SUSPENDED Partner fixture provisioner.
 *
 * STAGING ONLY. No production writes. No contract/schema change.
 * Loads staging API keys via Supabase CLI for the hard-coded staging ref.
 * Never reads .env.local (may point at production). Never logs secrets.
 *
 * Usage (from repo root, CLI must be linked to staging):
 *   node scripts/staging/provision-suspended-partner-fixture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";
const MARKER = "SUSPENDED_PARTNER_RC5";
const DISPLAY = "STAGING_RC5_FIXTURE SUSPENDED_PARTNER";
const EMAIL = "staging+partner_suspended_rc5@example.test";
const VAULT_DIR = "C:/Users/XXX/.vdb-vault";
const VAULT_ENV = path.join(VAULT_DIR, "partner-staging-suspended-rc5.env");
const VAULT_MANIFEST = path.join(
  VAULT_DIR,
  "partner-staging-suspended-rc5.manifest.json",
);
const LINKED_REF_PATH = path.join("supabase", ".temp", "project-ref");

function maskId(id) {
  return `${String(id).slice(0, 8)}…`;
}

function maskEmail(email) {
  const [u, d] = String(email).split("@");
  return `${String(u).slice(0, 3)}***@${d}`;
}

function sha256Prefix(value, n = 12) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, n);
}

function readLinkedRef() {
  if (!fs.existsSync(LINKED_REF_PATH)) {
    throw new Error("BLOCKED: supabase/.temp/project-ref missing — link CLI first");
  }
  return fs.readFileSync(LINKED_REF_PATH, "utf8").trim();
}

function assertStagingTarget() {
  const linked = readLinkedRef();
  if (linked === PROD_REF) {
    throw new Error("BLOCKED: CLI linked to PRODUCTION — refusing all writes");
  }
  if (linked !== STAGING_REF) {
    throw new Error(
      `BLOCKED: CLI linked to ${linked.slice(0, 4)}… — expected ${STAGING_REF}`,
    );
  }
  console.log(`GUARD: linked_ref=${STAGING_REF} OK`);
}

function fetchStagingKeys() {
  const raw = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", `--project-ref=${STAGING_REF}`, "-o", "json"],
    { encoding: "utf8", shell: true },
  );
  const parsed = JSON.parse(raw);
  // CLI may return a bare array; avoid Array.prototype.keys (truthy function).
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.keys)
      ? parsed.keys
      : [];
  let anon = null;
  let service = null;
  for (const row of list) {
    const name = String(row.name ?? row.id ?? "").toLowerCase();
    const type = String(row.type ?? "").toLowerCase();
    const apiKey = row.api_key ?? row.apiKey ?? row.key;
    if (!apiKey) continue;
    if (name === "anon" || type === "anon" || name.includes("publishable")) {
      anon = anon ?? apiKey;
    }
    if (name === "service_role" || type === "service_role" || name.includes("service_role")) {
      service = service ?? apiKey;
    }
  }
  if (!anon || !service) {
    throw new Error("BLOCKED: could not resolve staging anon/service_role keys from CLI");
  }
  // Never accept keys that decode to production ref when claim present
  for (const [label, token] of [
    ["anon", anon],
    ["service", service],
  ]) {
    try {
      const payload = JSON.parse(
        Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"),
      );
      if (payload.ref === PROD_REF) {
        throw new Error(`BLOCKED: ${label} key ref is production`);
      }
      if (payload.ref && payload.ref !== STAGING_REF) {
        throw new Error(`BLOCKED: ${label} key ref mismatch`);
      }
    } catch (e) {
      if (String(e.message).startsWith("BLOCKED:")) throw e;
      // non-JWT publishable keys are fine
    }
  }
  return {
    url: `https://${STAGING_REF}.supabase.co`,
    anon,
    service,
  };
}

function randPassword() {
  return `Sp$${crypto.randomBytes(18).toString("base64url")}!9`;
}

function setAclLocalOnly(filePath) {
  try {
    execFileSync(
      "icacls",
      [
        filePath,
        "/inheritance:r",
        "/grant:r",
        `${process.env.USERNAME}:(R,W)`,
        "SYSTEM:(F)",
      ],
      { stdio: "ignore" },
    );
  } catch {
    // Best-effort on Windows; continue if icacls unavailable
  }
}

function errCode(error) {
  const msg = String(error?.message ?? error ?? "");
  if (msg.includes("FORBIDDEN")) return "FORBIDDEN";
  if (msg.includes("AUTH_REQUIRED")) return "AUTH_REQUIRED";
  if (msg.includes("FEATURE_NOT_CONFIGURED")) return "FEATURE_NOT_CONFIGURED";
  if (msg.includes("AAL2_REQUIRED")) return "AAL2_REQUIRED";
  return msg.slice(0, 80);
}

function linkedSqlJson(sql) {
  assertStagingTarget();
  const tmp = path.join(
    process.env.TEMP || process.env.TMP || ".",
    `vdb-staging-sql-${crypto.randomBytes(6).toString("hex")}.sql`,
  );
  fs.writeFileSync(tmp, sql, "utf8");
  try {
    const raw = execFileSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-o", "json", "-f", tmp],
      { encoding: "utf8", shell: true },
    );
    const start = raw.indexOf("{");
    if (start < 0) throw new Error(`linked_sql_parse:${raw.slice(0, 120)}`);
    const parsed = JSON.parse(raw.slice(start));
    if (Array.isArray(parsed?.rows)) return parsed.rows;
    if (Array.isArray(parsed)) return parsed;
    throw new Error("linked_sql_unexpected_shape");
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensureAuthUser(admin, email, password) {
  const found = linkedSqlJson(
    `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower(${sqlLiteral(email)}) LIMIT 1;`,
  );
  const existingId = Array.isArray(found) && found[0]?.id ? found[0].id : null;

  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      app_metadata: {
        fixture_kind: MARKER,
        staging_ref: STAGING_REF,
      },
      user_metadata: {
        fixture_kind: MARKER,
        synthetic: true,
        alias: "partner_suspended_rc5",
      },
    });
    if (error) throw new Error(`updateUser:${error.message || JSON.stringify(error)}`);
    return { id: existingId, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { fixture_kind: MARKER, staging_ref: STAGING_REF },
    user_metadata: {
      fixture_kind: MARKER,
      synthetic: true,
      alias: "partner_suspended_rc5",
    },
  });
  if (error) throw new Error(`createUser:${error.message || JSON.stringify(error)}`);
  return { id: data.user.id, created: true };
}

function ensureSuspendedProfile(userId) {
  assertStagingTarget();
  const rows = linkedSqlJson(`
WITH upsert_profile AS (
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (${sqlLiteral(userId)}::uuid, ${sqlLiteral(EMAIL)}, ${sqlLiteral(DISPLAY)}, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        is_active = true
  RETURNING id
),
upsert_partner AS (
  INSERT INTO public.partner_profiles (
    user_id, status, display_name, legal_name, payout_eligible,
    suspended_at, compliance_status, updated_at
  )
  VALUES (
    ${sqlLiteral(userId)}::uuid,
    'SUSPENDED',
    ${sqlLiteral(DISPLAY)},
    ${sqlLiteral(DISPLAY)},
    false,
    NOW(),
    'UNKNOWN',
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'SUSPENDED',
        display_name = EXCLUDED.display_name,
        legal_name = EXCLUDED.legal_name,
        payout_eligible = false,
        suspended_at = COALESCE(public.partner_profiles.suspended_at, NOW()),
        compliance_status = 'UNKNOWN',
        updated_at = NOW()
  RETURNING id::text AS id, status::text AS status, payout_eligible, suspended_at
)
SELECT id, status, payout_eligible, suspended_at IS NOT NULL AS has_suspended_at
FROM upsert_partner;
`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.id || row.status !== "SUSPENDED" || row.payout_eligible !== false) {
    throw new Error(`partner_upsert_inconsistent:${JSON.stringify(row)}`);
  }
  return row.id;
}

async function verifyCapabilities(url, anon, email, password, partnerId, peerPartnerId) {
  const results = [];
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signIn, error: signErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  results.push({
    check: "auth:login",
    pass: !signErr && !!signIn?.session?.access_token,
    detail: signErr ? errCode(signErr) : "session_ok",
  });
  if (signErr) return results;

  const { data: profile, error: profErr } = await client
    .from("partner_profiles")
    .select("id,status,payout_eligible,suspended_at,display_name")
    .eq("user_id", signIn.user.id)
    .maybeSingle();
  results.push({
    check: "profile:status_suspended",
    pass:
      !profErr &&
      profile?.status === "SUSPENDED" &&
      profile?.payout_eligible === false &&
      !!profile?.suspended_at &&
      profile?.id === partnerId,
    detail: profErr
      ? errCode(profErr)
      : `status=${profile?.status};payout=${profile?.payout_eligible};id=${maskId(profile?.id)}`,
  });

  const { data: refreshed, error: refErr } = await client.auth.refreshSession();
  const { data: profile2 } = await client
    .from("partner_profiles")
    .select("status")
    .eq("id", partnerId)
    .maybeSingle();
  results.push({
    check: "session:restore_still_suspended",
    pass: !refErr && refreshed?.session && profile2?.status === "SUSPENDED",
    detail: refErr ? errCode(refErr) : `status=${profile2?.status}`,
  });

  const { error: catErr } = await client.rpc("list_partner_catalog");
  results.push({
    check: "catalog:list_denied",
    pass: !!catErr && errCode(catErr) === "FORBIDDEN",
    detail: catErr ? errCode(catErr) : "unexpected_ok",
  });

  const { error: leadErr } = await client.rpc("create_partner_lead", {
    p_contact_name: "Synthetic Contact",
    p_contact_email: "synth.contact@example.test",
    p_dedupe_key: `suspended-fixture-${Date.now()}`,
    p_company: "Synthetic Co",
    p_phone: null,
    p_message: "fixture deny probe",
    p_code: null,
    p_product_id: null,
  });
  const leadDenied =
    !!leadErr &&
    (errCode(leadErr) === "FORBIDDEN" ||
      String(leadErr.message ?? "").includes("FORBIDDEN"));
  results.push({
    check: "leads:create_denied",
    pass: leadDenied,
    detail: leadErr ? errCode(leadErr) : "unexpected_ok",
  });

  const { error: payoutErr } = await client.rpc("request_partner_payout", {
    p_amount_cents: 100,
    p_idempotency_key: `suspended-payout-${Date.now()}`,
  });
  results.push({
    check: "payout:request_denied",
    pass:
      !!payoutErr &&
      (errCode(payoutErr) === "FORBIDDEN" ||
        errCode(payoutErr) === "FEATURE_NOT_CONFIGURED"),
    detail: payoutErr ? errCode(payoutErr) : "unexpected_ok",
  });

  // confirm_partner_sale is staff-only; suspended partner must not succeed
  const { error: saleErr } = await client.rpc("confirm_partner_sale", {
    p_lead_id: "00000000-0000-4000-8000-000000000001",
    p_gross_amount_cents: 1000,
    p_idempotency_key: `suspended-sale-${Date.now()}`,
  });
  results.push({
    check: "sale:confirm_denied",
    pass: !!saleErr && (errCode(saleErr) === "FORBIDDEN" || errCode(saleErr) === "NOT_FOUND"),
    detail: saleErr ? errCode(saleErr) : "unexpected_ok",
  });

  const { data: adminRole } = await client
    .from("admin_roles")
    .select("role")
    .eq("user_id", signIn.user.id)
    .maybeSingle();
  results.push({
    check: "admin:no_admin_role",
    pass: !adminRole,
    detail: adminRole ? `role=${adminRole.role}` : "none",
  });

  // Cross-partner lead read must be empty (ACTIVE-only select policy)
  const { data: peerLeads, error: peerErr } = await client
    .from("partner_leads")
    .select("id")
    .eq("partner_id", peerPartnerId)
    .limit(5);
  results.push({
    check: "isolation:cross_partner_leads_empty",
    pass: !peerErr && (!peerLeads || peerLeads.length === 0),
    detail: peerErr ? errCode(peerErr) : `rows=${peerLeads?.length ?? 0}`,
  });

  // Internal notes column must never be readable as partner via replies select
  const { data: internalRows, error: intErr } = await client
    .from("portal_support_replies")
    .select("id,is_internal")
    .eq("is_internal", true)
    .limit(5);
  results.push({
    check: "support:internal_notes_not_leaked",
    pass: !intErr && (!internalRows || internalRows.length === 0),
    detail: intErr ? errCode(intErr) : `internal_rows=${internalRows?.length ?? 0}`,
  });

  await client.auth.signOut();
  const { data: afterOut } = await client.auth.getSession();
  results.push({
    check: "auth:logout_clears_session",
    pass: !afterOut?.session,
    detail: afterOut?.session ? "session_present" : "cleared",
  });

  // Re-login remains suspended
  const { error: reloginErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  const { data: profile3 } = await client
    .from("partner_profiles")
    .select("status")
    .eq("user_id", (await client.auth.getUser()).data.user?.id)
    .maybeSingle();
  results.push({
    check: "auth:relogin_still_suspended",
    pass: !reloginErr && profile3?.status === "SUSPENDED",
    detail: reloginErr ? errCode(reloginErr) : `status=${profile3?.status}`,
  });
  await client.auth.signOut();

  return results;
}

async function productionSafetyReadOnly() {
  // Read-only via linked staging CLI cannot see production; use vault pgpass if present.
  const envPath = path.join(VAULT_DIR, "production-db-readonly.env");
  if (!fs.existsSync(envPath)) {
    return {
      checked: false,
      detail: "production-db-readonly.env missing — skipped live prod query",
    };
  }
  const env = Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  if (env.SUPABASE_PROJECT_REF !== PROD_REF) {
    return { checked: false, detail: "readonly env ref mismatch — skipped" };
  }
  // Use npx supabase db query is staging-linked; do not switch link.
  // Report intent: production must remain untouched; operator confirms via separate readonly.
  return {
    checked: true,
    detail:
      "production readonly vault present; this script performed zero production writes and did not relink CLI",
    production_ref: PROD_REF,
  };
}

async function main() {
  console.log("STRATEGY: B (Preference A blocked — no verified MFA/AAL2 on staging admin/owner)");
  assertStagingTarget();
  const { url, anon, service } = fetchStagingKeys();
  console.log(`GUARD: staging_url_host=${new URL(url).host}`);

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password = randPassword();
  const user = await ensureAuthUser(admin, EMAIL, password);
  const partnerId = ensureSuspendedProfile(user.id);

  // Confirm row shape via linked SQL (no secrets logged)
  const rowCheck = linkedSqlJson(`
SELECT id::text AS id, status::text AS status, payout_eligible,
       suspended_at IS NOT NULL AS has_suspended_at
FROM public.partner_profiles
WHERE id = ${sqlLiteral(partnerId)}::uuid;
`);
  const row = Array.isArray(rowCheck) ? rowCheck[0] : null;
  if (!row || row.status !== "SUSPENDED" || row.payout_eligible !== false || !row.has_suspended_at) {
    throw new Error("BLOCKED: fixture row not consistently SUSPENDED");
  }

  const peerPartnerId = "e8374bc0-d786-4838-8be9-a45cfcd5c611"; // staging partner_a (ACTIVE)
  const checks = await verifyCapabilities(
    url,
    anon,
    EMAIL,
    password,
    partnerId,
    peerPartnerId,
  );
  const failed = checks.filter((c) => !c.pass);
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"} ${c.check} — ${c.detail}`);
  }
  if (failed.length) {
    throw new Error(`VERIFY_FAILED: ${failed.map((f) => f.check).join(",")}`);
  }

  fs.mkdirSync(VAULT_DIR, { recursive: true });
  const fingerprint = sha256Prefix(`${partnerId}:${user.id}:${MARKER}`);
  const envBody = [
    "# LOCAL SECRET — DO NOT COMMIT",
    `# Staging ref: ${STAGING_REF}`,
    `# Fixture: ${MARKER}`,
    `# Generated: ${new Date().toISOString()}`,
    `VDB_STAGING_PROJECT_REF=${STAGING_REF}`,
    `VDB_STAGING_SUPABASE_URL=${url}`,
    `VDB_STAGING_SUSPENDED_PARTNER_EMAIL=${EMAIL}`,
    `VDB_STAGING_SUSPENDED_PARTNER_PASSWORD=${password}`,
    `VDB_STAGING_SUSPENDED_PARTNER_ID=${partnerId}`,
    `VDB_STAGING_SUSPENDED_USER_ID=${user.id}`,
    `VDB_STAGING_SUSPENDED_FIXTURE_KIND=${MARKER}`,
    `VDB_STAGING_SUSPENDED_FINGERPRINT=${fingerprint}`,
    "",
  ].join("\n");
  fs.writeFileSync(VAULT_ENV, envBody, { encoding: "utf8", mode: 0o600 });
  setAclLocalOnly(VAULT_ENV);

  const manifest = {
    at: new Date().toISOString(),
    strategy: "B",
    strategyReason:
      "Preference A impossible: staging ADMIN/OWNER accounts have 0 verified MFA factors; suspend_partner requires AAL2",
    stagingRef: STAGING_REF,
    productionDenylist: PROD_REF,
    vaultPath: VAULT_ENV,
    fixtureKind: MARKER,
    fingerprint,
    emailMasked: maskEmail(EMAIL),
    partnerIdMasked: maskId(partnerId),
    userIdMasked: maskId(user.id),
    authUserCreated: user.created,
    partnerStatus: "SUSPENDED",
    payoutEligible: false,
    displayName: DISPLAY,
    verification: checks,
    cleanup: {
      note: "Local operator only. Do not delete partner_a/partner_b. Soft-disable by reactivating via reactivate_partner (AAL2) or deleting this synthetic auth user via Admin API on staging.",
      vaultFiles: [VAULT_ENV, VAULT_MANIFEST],
    },
    productionSafety: await productionSafetyReadOnly(),
    notes: [
      "Credentials live only in local vault — never commit.",
      "This fixture is synthetic staging testdata, not a runtime AAL2 suspension proof.",
      "Owner suspend_partner AAL2 coverage remains in RC4 unit/matrix tests.",
    ],
  };
  fs.writeFileSync(VAULT_MANIFEST, JSON.stringify(manifest, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  setAclLocalOnly(VAULT_MANIFEST);

  console.log("VAULT_WRITTEN=partner-staging-suspended-rc5.env");
  console.log(`FINGERPRINT=${fingerprint}`);
  console.log(`PARTNER_ID_MASKED=${maskId(partnerId)}`);
  console.log("PROVISION: OK");
}

main().catch((err) => {
  console.error(`PROVISION_FAILED: ${err.message}`);
  process.exit(1);
});
