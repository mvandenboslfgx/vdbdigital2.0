/**
 * Owner RC6 — staging evidence for partner approval AAL2 remediation.
 *
 * STAGING ONLY (qzekuvmgfekzsowdecyk). Production denied.
 * Secrets stay in local vault; evidence writes masked prefixes only.
 *
 * Usage (repo root, CLI linked to staging):
 *   node scripts/staging/rc6-partner-approval-aal2-evidence.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";
const INCIDENT_PREFIX = "9dae6417";
const DO_NOT_TOUCH_PREFIX = "4b8bd7f1";
const SCHEMA_VERSION = "2026.07.29.partner-approval-aal2-rc6";
const FIXTURE_MARKER = "RC6_REVIEW_AAL2_SYNTHETIC";
const FIXTURE_EMAIL_APPROVE = "staging+rc6_review_approve@example.test";
const FIXTURE_EMAIL_REJECT = "staging+rc6_review_reject@example.test";
const ROLLBACK_REASON = "INCIDENT_ROLLBACK_AAL2_GATE_PROBE";

const HOME = process.env.USERPROFILE || "C:/Users/XXX";
const VAULT_DIR = path.join(HOME, ".vdb-vault");
const ROLE_MATRIX_ENV = path.join(VAULT_DIR, "mobile-rc3-staging-role-matrix.env");
const MFA_ENV = path.join(VAULT_DIR, "owner-staging-mfa-operator-rc5.env");
const LINKED_REF_PATH = path.join("supabase", ".temp", "project-ref");
const EVIDENCE_DIR =
  "docs/artifacts/owner-rc6-partner-approval-aal2-2026-07-29";

const results = [];

function record(name, status, detail = {}) {
  results.push({ name, status, ...detail });
  const extra = detail.note ? ` — ${detail.note}` : "";
  console.log(`${status} ${name}${extra}`);
}

function maskId(id) {
  return id ? `${String(id).slice(0, 8)}…` : null;
}

function sha256Prefix(value, n = 12) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, n);
}

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function readLinkedRef() {
  if (!fs.existsSync(LINKED_REF_PATH)) {
    throw new Error("BLOCKED: supabase/.temp/project-ref missing");
  }
  return fs.readFileSync(LINKED_REF_PATH, "utf8").trim();
}

function assertStagingTarget() {
  const linked = readLinkedRef();
  if (linked === PROD_REF) throw new Error("BLOCKED: linked to PRODUCTION");
  if (linked !== STAGING_REF) {
    throw new Error(`BLOCKED: linked to ${linked}; expected ${STAGING_REF}`);
  }
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function linkedSqlJson(sql) {
  assertStagingTarget();
  const tmp = path.join(
    process.env.TEMP || process.env.TMP || ".",
    `vdb-rc6-sql-${crypto.randomBytes(6).toString("hex")}.sql`,
  );
  fs.writeFileSync(tmp, sql, "utf8");
  try {
    const raw = execFileSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-o", "json", "-f", tmp],
      { encoding: "utf8", shell: true },
    );
    const start = raw.indexOf("{");
    if (start < 0) throw new Error(`linked_sql_parse:${raw.slice(0, 160)}`);
    const parsed = JSON.parse(raw.slice(start));
    if (Array.isArray(parsed?.rows)) return parsed.rows;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.data)) return parsed.data;
    throw new Error("linked_sql_unexpected_shape");
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

function fetchStagingKeys() {
  const raw = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", `--project-ref=${STAGING_REF}`, "-o", "json"],
    { encoding: "utf8", shell: true },
  );
  const parsed = JSON.parse(raw);
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
  if (!anon || !service) throw new Error("BLOCKED: missing staging anon/service keys");
  return { url: `https://${STAGING_REF}.supabase.co`, anon, service };
}

function decodeBase32(secretBase32) {
  const cleaned = secretBase32.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error("invalid_base32");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32, nowMs = Date.now()) {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(nowMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function rpcErrorCode(error) {
  const msg = String(error?.message ?? error ?? "");
  for (const code of [
    "AAL2_REQUIRED",
    "AUTH_REQUIRED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_FAILED",
    "INVALID_TRANSITION",
    "IDEMPOTENCY_CONFLICT",
  ]) {
    if (msg.includes(code)) return code;
  }
  return msg.slice(0, 120);
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn_failed:${error.message}`);
  return data;
}

async function getAal(supabase) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? null;
}

async function stepUpAal2(supabase, factorId, secret, { wrongCode = false } = {}) {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeErr || !challenge) {
    return { ok: false, error: challengeErr?.message ?? "challenge_failed" };
  }
  const code = wrongCode
    ? generateTotpCode(secret, Date.now() - 30 * 1000 * 20)
    : generateTotpCode(secret);
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) return { ok: false, error: verifyErr.message };
  return { ok: true };
}

async function ensureAuthUser(admin, email, password) {
  const found = linkedSqlJson(
    `SELECT id::text AS id FROM auth.users WHERE lower(email)=lower(${sqlLiteral(email)}) LIMIT 1;`,
  );
  const existingId = found?.[0]?.id ?? null;
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      app_metadata: { fixture_kind: FIXTURE_MARKER, staging_ref: STAGING_REF },
      user_metadata: { fixture_kind: FIXTURE_MARKER, synthetic: true },
    });
    if (error) throw new Error(`update_user_failed:${error.message}`);
    linkedSqlJson(`
      INSERT INTO public.profiles (id, email, full_name, is_active)
      VALUES (
        ${sqlLiteral(existingId)}::uuid,
        ${sqlLiteral(email)},
        ${sqlLiteral("STAGING_RC6_FIXTURE")},
        true
      )
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            is_active = true;
    `);
    return existingId;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { fixture_kind: FIXTURE_MARKER, staging_ref: STAGING_REF },
    user_metadata: { fixture_kind: FIXTURE_MARKER, synthetic: true },
  });
  if (error || !data?.user?.id) throw new Error(`create_user_failed:${error?.message}`);
  linkedSqlJson(`
    INSERT INTO public.profiles (id, email, full_name, is_active)
    VALUES (
      ${sqlLiteral(data.user.id)}::uuid,
      ${sqlLiteral(email)},
      ${sqlLiteral("STAGING_RC6_FIXTURE")},
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          is_active = true;
  `);
  return data.user.id;
}

function ensureSubmittedApplication(userId, legalName) {
  const contactEmail = `${legalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")}@example.test`;

  const existing = linkedSqlJson(`
    SELECT id::text AS id, status::text AS status
    FROM public.partner_applications
    WHERE user_id = ${sqlLiteral(userId)}::uuid
      AND legal_name = ${sqlLiteral(legalName)}
    ORDER BY created_at DESC
    LIMIT 1;
  `);

  let id = existing?.[0]?.id ?? null;
  let status = existing?.[0]?.status ?? null;

  if (!id) {
    const inserted = linkedSqlJson(`
      INSERT INTO public.partner_applications (
        user_id, status, legal_name, trade_name, contact_email, partner_type, submitted_at
      ) VALUES (
        ${sqlLiteral(userId)}::uuid,
        'SUBMITTED',
        ${sqlLiteral(legalName)},
        ${sqlLiteral(legalName)},
        ${sqlLiteral(contactEmail)},
        'INDIVIDUAL',
        NOW()
      )
      RETURNING id::text AS id, status::text AS status;
    `);
    id = inserted?.[0]?.id ?? null;
    status = inserted?.[0]?.status ?? null;
  }

  if (!id) throw new Error("fixture_application_missing");
  if (
    id.startsWith(INCIDENT_PREFIX) ||
    id.startsWith(DO_NOT_TOUCH_PREFIX)
  ) {
    throw new Error("BLOCKED: synthetic fixture collided with protected prefixes");
  }

  if (status !== "SUBMITTED") {
    linkedSqlJson(`
      UPDATE public.partner_applications
      SET status = 'SUBMITTED',
          rejection_reason = NULL,
          reviewed_at = NULL,
          reviewed_by = NULL,
          staff_approved_at = NULL,
          staff_approved_by = NULL,
          updated_at = NOW()
      WHERE id = ${sqlLiteral(id)}::uuid
        AND id::text NOT LIKE '${DO_NOT_TOUCH_PREFIX}%'
        AND id::text NOT LIKE '${INCIDENT_PREFIX}%';
    `);
  }
  return id;
}

function appSnapshot(prefixOrId) {
  const clause = String(prefixOrId).includes("-")
    ? `a.id = ${sqlLiteral(prefixOrId)}::uuid`
    : `a.id::text LIKE ${sqlLiteral(prefixOrId + "%")}`;
  const rows = linkedSqlJson(`
    SELECT left(a.id::text,8) AS app_prefix,
           a.id::text AS app_id,
           a.status::text AS app_status,
           a.reviewed_at IS NOT NULL AS has_reviewed,
           a.staff_approved_at IS NOT NULL AS has_staff_approved,
           left(pp.id::text,8) AS partner_prefix,
           pp.status::text AS partner_status,
           COALESCE(pp.payout_eligible,false) AS payout_eligible
    FROM public.partner_applications a
    LEFT JOIN public.partner_profiles pp ON pp.user_id = a.user_id
    WHERE ${clause}
    LIMIT 1;
  `);
  return rows?.[0] ?? null;
}

function countSuccessAudits(appId, sinceIso) {
  const rows = linkedSqlJson(`
    SELECT count(*)::int AS n
    FROM public.audit_logs
    WHERE resource_id = ${sqlLiteral(appId)}
      AND action IN (
        'admin.partner.application.approved',
        'admin.partner.application.rejected'
      )
      AND created_at >= ${sqlLiteral(sinceIso)}::timestamptz;
  `);
  return rows?.[0]?.n ?? 0;
}

function rollbackIncident() {
  const before = appSnapshot(INCIDENT_PREFIX);
  if (!before) throw new Error("incident_app_missing");
  if (before.app_prefix !== INCIDENT_PREFIX) throw new Error("incident_prefix_mismatch");

  linkedSqlJson(`
    DO $$
    DECLARE
      v_app_id uuid;
      v_user_id uuid;
      v_partner_id uuid;
    BEGIN
      SELECT pa.id, pa.user_id INTO v_app_id, v_user_id
      FROM public.partner_applications pa
      WHERE pa.id::text LIKE '${INCIDENT_PREFIX}%'
      FOR UPDATE;
      IF v_app_id IS NULL THEN
        RAISE EXCEPTION 'incident_not_found';
      END IF;

      -- Never touch the protected remaining application.
      IF v_app_id::text LIKE '${DO_NOT_TOUCH_PREFIX}%' THEN
        RAISE EXCEPTION 'refusing_do_not_touch';
      END IF;

      UPDATE public.partner_applications pa
      SET status = 'SUBMITTED',
          rejection_reason = NULL,
          reviewed_at = NULL,
          reviewed_by = NULL,
          staff_approved_at = NULL,
          staff_approved_by = NULL,
          updated_at = NOW()
      WHERE pa.id = v_app_id;

      SELECT pp.id INTO v_partner_id
      FROM public.partner_profiles pp
      WHERE pp.user_id = v_user_id
      FOR UPDATE;

      IF v_partner_id IS NOT NULL THEN
        UPDATE public.partner_profiles pp
        SET status = 'PENDING',
            payout_eligible = false,
            staff_approved_at = NULL,
            staff_approved_by = NULL,
            updated_at = NOW()
        WHERE pp.id = v_partner_id;
      END IF;

      INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
      VALUES (
        NULL,
        'admin.partner.application.incident_rollback',
        'partner_applications',
        v_app_id::text,
        jsonb_build_object(
          'reason', '${ROLLBACK_REASON}',
          'previous_status', 'APPROVED',
          'restored_status', 'SUBMITTED',
          'schema_version', '${SCHEMA_VERSION}',
          'app_prefix', '${INCIDENT_PREFIX}'
        )
      );
    END $$;
  `);

  const after = appSnapshot(INCIDENT_PREFIX);
  const untouched = appSnapshot(DO_NOT_TOUCH_PREFIX);
  return { before, after, untouched };
}

async function main() {
  assertStagingTarget();
  record("staging_target_guard", "PASS", { note: STAGING_REF });

  // Production deny-check (read-only intent): refuse if linked changes
  try {
    if (readLinkedRef() === PROD_REF) throw new Error("prod");
    record("production_untouched_guard", "PASS", { note: PROD_REF });
  } catch {
    record("production_untouched_guard", "FAIL");
    throw new Error("BLOCKED");
  }

  if (!fs.existsSync(ROLE_MATRIX_ENV)) throw new Error(`missing vault ${ROLE_MATRIX_ENV}`);
  if (!fs.existsSync(MFA_ENV)) throw new Error(`missing vault ${MFA_ENV}`);
  const roles = parseEnvFile(ROLE_MATRIX_ENV);
  const mfa = parseEnvFile(MFA_ENV);

  const keys = fetchStagingKeys();
  const admin = createClient(keys.url, keys.service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonClient = () =>
    createClient(keys.url, keys.anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  // --- Migration presence ---
  const tip = linkedSqlJson(
    `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;`,
  );
  const tipVersion = tip?.[0]?.version ?? null;
  if (tipVersion === "20260729141024" || Number(tipVersion) >= 20260729141024) {
    record("migration_tip_rc6", "PASS", { note: String(tipVersion) });
  } else {
    record("migration_tip_rc6", "FAIL", { note: `tip=${tipVersion}` });
    throw new Error("Apply RC6 migration before evidence");
  }

  const verifyRows = linkedSqlJson(
    `SELECT check_name, ok, detail FROM public.verify_partner_approval_aal2_rc6_contracts() ORDER BY 1;`,
  );
  const verifyFail = (verifyRows || []).filter((r) => r.ok !== true && r.ok !== "t" && r.ok !== true);
  // ok may come back as boolean true
  const bad = (verifyRows || []).filter((r) => !(r.ok === true || r.ok === "t"));
  if (bad.length === 0) {
    record("verify_partner_approval_aal2_rc6_contracts", "PASS", {
      note: `${verifyRows.length} checks`,
    });
  } else {
    record("verify_partner_approval_aal2_rc6_contracts", "FAIL", {
      note: bad.map((b) => b.check_name).join(","),
    });
  }

  // --- Sibling audit table (from verifier + explicit) ---
  const sibling = linkedSqlJson(`
    SELECT p.proname,
           (p.prosrc LIKE '%require_aal2%') AS has_aal2,
           count(*) OVER (PARTITION BY p.proname) AS overload_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN (
        'review_partner_application',
        'approve_partner_commission',
        'reject_partner_commission',
        'suspend_partner',
        'reactivate_partner',
        'activate_partner_profile',
        'staff_set_partner_compliance_fixture'
      )
    ORDER BY 1;
  `);
  const siblingRequired = [
    "review_partner_application",
    "approve_partner_commission",
    "reject_partner_commission",
    "suspend_partner",
    "reactivate_partner",
    "activate_partner_profile",
  ];
  const siblingOk = siblingRequired.every((name) =>
    (sibling || []).some((r) => r.proname === name && (r.has_aal2 === true || r.has_aal2 === "t")),
  );
  record("sibling_aal2_audit", siblingOk ? "PASS" : "FAIL", {
    note: (sibling || [])
      .map((r) => `${r.proname}:${r.has_aal2 ? "aal2" : "no-aal2"}`)
      .join(";"),
  });

  // --- Incident rollback ---
  const rb = rollbackIncident();
  const rollbackPass =
    rb.after?.app_status === "SUBMITTED" &&
    rb.after?.has_reviewed === false &&
    rb.after?.partner_status === "PENDING" &&
    (rb.after?.payout_eligible === false || rb.after?.payout_eligible === "f") &&
    rb.untouched?.app_status === "SUBMITTED" &&
    rb.untouched?.app_prefix === DO_NOT_TOUCH_PREFIX;
  record("incident_rollback_9dae6417", rollbackPass ? "PASS" : "FAIL", {
    note: `after=${rb.after?.app_status}; partner=${rb.after?.partner_status}; payout=${rb.after?.payout_eligible}`,
  });

  const rollbackAudit = linkedSqlJson(`
    SELECT metadata->>'reason' AS reason
    FROM public.audit_logs
    WHERE resource_id LIKE '${INCIDENT_PREFIX}%'
      AND action = 'admin.partner.application.incident_rollback'
    ORDER BY created_at DESC LIMIT 1;
  `);
  record(
    "incident_rollback_audit_reason",
    rollbackAudit?.[0]?.reason === ROLLBACK_REASON ? "PASS" : "FAIL",
    { note: ROLLBACK_REASON },
  );

  // --- Synthetic fixtures ---
  const pwApprove = `Rc6$${crypto.randomBytes(16).toString("base64url")}!`;
  const pwReject = `Rc6$${crypto.randomBytes(16).toString("base64url")}!`;
  const userApprove = await ensureAuthUser(admin, FIXTURE_EMAIL_APPROVE, pwApprove);
  const userReject = await ensureAuthUser(admin, FIXTURE_EMAIL_REJECT, pwReject);
  const appApproveId = ensureSubmittedApplication(
    userApprove,
    "STAGING_RC6_FIXTURE REVIEW_APPROVE",
  );
  const appRejectId = ensureSubmittedApplication(
    userReject,
    "STAGING_RC6_FIXTURE REVIEW_REJECT",
  );
  if (
    appApproveId.startsWith(INCIDENT_PREFIX) ||
    appApproveId.startsWith(DO_NOT_TOUCH_PREFIX) ||
    appRejectId.startsWith(INCIDENT_PREFIX) ||
    appRejectId.startsWith(DO_NOT_TOUCH_PREFIX)
  ) {
    throw new Error("BLOCKED: synthetic fixture collided with protected prefixes");
  }
  record("synthetic_fixtures", "PASS", {
    note: `approve=${maskId(appApproveId)}; reject=${maskId(appRejectId)}`,
  });

  const operatorSpecs = [
    {
      role: "ADMIN",
      email: roles.VDB_STAGING_ADMIN_EMAIL,
      password: roles.VDB_STAGING_ADMIN_PASSWORD,
      // MFA vault is ADMIN-oriented for step-up
      useMfaVault: true,
    },
    {
      role: "OWNER",
      email: roles.VDB_STAGING_OWNER_EMAIL,
      password: roles.VDB_STAGING_OWNER_PASSWORD,
      useMfaVault: false,
    },
  ];

  for (const spec of operatorSpecs) {
    if (!spec.email || !spec.password) throw new Error(`missing ${spec.role} credentials`);

    // AAL1 approve deny
    {
      const sb = anonClient();
      await signIn(sb, spec.email, spec.password);
      const aal = await getAal(sb);
      const before = appSnapshot(appApproveId);
      const since = new Date().toISOString();
      const { error } = await sb.rpc("review_partner_application", {
        p_application_id: appApproveId,
        p_approve: true,
        p_rejection_reason: null,
        p_partner_code: null,
      });
      const code = rpcErrorCode(error);
      const after = appSnapshot(appApproveId);
      const audits = countSuccessAudits(appApproveId, since);
      const pass =
        aal === "aal1" &&
        code === "AAL2_REQUIRED" &&
        after?.app_status === before?.app_status &&
        audits === 0;
      record(`${spec.role}_AAL1_approve_denied`, pass ? "PASS" : "FAIL", {
        note: `aal=${aal}; code=${code}; audits=${audits}`,
      });
      await sb.auth.signOut();
    }

    // AAL1 reject deny
    {
      const sb = anonClient();
      await signIn(sb, spec.email, spec.password);
      const aal = await getAal(sb);
      const before = appSnapshot(appRejectId);
      const since = new Date().toISOString();
      const { error } = await sb.rpc("review_partner_application", {
        p_application_id: appRejectId,
        p_approve: false,
        p_rejection_reason: "rc6_aal1_probe",
        p_partner_code: null,
      });
      const code = rpcErrorCode(error);
      const after = appSnapshot(appRejectId);
      const audits = countSuccessAudits(appRejectId, since);
      const pass =
        aal === "aal1" &&
        code === "AAL2_REQUIRED" &&
        after?.app_status === before?.app_status &&
        audits === 0;
      record(`${spec.role}_AAL1_reject_denied`, pass ? "PASS" : "FAIL", {
        note: `aal=${aal}; code=${code}; audits=${audits}`,
      });
      await sb.auth.signOut();
    }
  }

  // Wrong TOTP deny + correct AAL2 approve once (ADMIN MFA vault)
  const factorId = mfa.VDB_STAGING_OPERATOR_FACTOR_ID;
  const totpSecret = mfa.VDB_STAGING_OPERATOR_TOTP_SECRET;
  const adminEmail = mfa.VDB_STAGING_OPERATOR_EMAIL || roles.VDB_STAGING_ADMIN_EMAIL;
  const adminPassword =
    mfa.VDB_STAGING_OPERATOR_PASSWORD || roles.VDB_STAGING_ADMIN_PASSWORD;
  if (!factorId || !totpSecret) throw new Error("MFA vault incomplete");

  {
    const sb = anonClient();
    await signIn(sb, adminEmail, adminPassword);
    const aal1 = await getAal(sb);
    const wrong = await stepUpAal2(sb, factorId, totpSecret, { wrongCode: true });
    const aalAfterWrong = await getAal(sb);
    const passWrong =
      aal1 === "aal1" && wrong.ok === false && aalAfterWrong === "aal1";
    record("wrong_totp_deny", passWrong ? "PASS" : "FAIL", {
      note: `aalAfter=${aalAfterWrong}`,
    });

    const step = await stepUpAal2(sb, factorId, totpSecret, { wrongCode: false });
    const aal2 = await getAal(sb);
    if (!step.ok || aal2 !== "aal2") {
      record("correct_aal2_step_up", "FAIL", { note: step.error || aal2 });
      throw new Error("aal2_step_up_failed");
    }
    record("correct_aal2_step_up", "PASS");

    const before = appSnapshot(appApproveId);
    const since = new Date().toISOString();
    const { data, error } = await sb.rpc("review_partner_application", {
      p_application_id: appApproveId,
      p_approve: true,
      p_rejection_reason: null,
      p_partner_code: null,
    });
    const after = appSnapshot(appApproveId);
    const audits = countSuccessAudits(appApproveId, since);

    // second call should be idempotent (no second success transition)
    const { error: err2 } = await sb.rpc("review_partner_application", {
      p_application_id: appApproveId,
      p_approve: true,
      p_rejection_reason: null,
      p_partner_code: null,
    });
    const audits2 = countSuccessAudits(appApproveId, since);

    const approvePass =
      !error &&
      before?.app_status === "SUBMITTED" &&
      after?.app_status === "APPROVED" &&
      after?.partner_status === "PENDING" &&
      (after?.payout_eligible === false || after?.payout_eligible === "f") &&
      audits === 1 &&
      !err2 &&
      audits2 === 1;
    record("aal2_synthetic_approve_once", approvePass ? "PASS" : "FAIL", {
      note: `data=${maskId(data)}; audits=${audits}; audits2=${audits2}; partner=${after?.partner_status}`,
    });
    record(
      "approval_not_auto_active",
      after?.partner_status === "PENDING" &&
        (after?.payout_eligible === false || after?.payout_eligible === "f")
        ? "PASS"
        : "FAIL",
      { note: `partner=${after?.partner_status}; payout=${after?.payout_eligible}` },
    );

    await sb.auth.signOut();
    await signIn(sb, adminEmail, adminPassword);
    const aalNew = await getAal(sb);
    record("new_session_starts_aal1", aalNew === "aal1" ? "PASS" : "FAIL", {
      note: `aal=${aalNew}`,
    });
    await sb.auth.signOut();
  }

  // AAL2 reject on synthetic reject fixture
  {
    const sb = anonClient();
    await signIn(sb, adminEmail, adminPassword);
    const step = await stepUpAal2(sb, factorId, totpSecret);
    if (!step.ok) throw new Error(`reject_step_up_failed:${step.error}`);
    const since = new Date().toISOString();
    const { error } = await sb.rpc("review_partner_application", {
      p_application_id: appRejectId,
      p_approve: false,
      p_rejection_reason: "rc6_synthetic_reject",
      p_partner_code: null,
    });
    const after = appSnapshot(appRejectId);
    const audits = countSuccessAudits(appRejectId, since);
    const pass =
      !error && after?.app_status === "REJECTED" && audits === 1;
    record("aal2_synthetic_reject_once", pass ? "PASS" : "FAIL", {
      note: `status=${after?.app_status}; audits=${audits}; err=${error ? rpcErrorCode(error) : "none"}`,
    });
    await sb.auth.signOut();
  }

  // Protected prefixes still intact
  const incidentFinal = appSnapshot(INCIDENT_PREFIX);
  const otherFinal = appSnapshot(DO_NOT_TOUCH_PREFIX);
  record(
    "protected_prefixes_untouched_by_probes",
    incidentFinal?.app_status === "SUBMITTED" &&
      otherFinal?.app_status === "SUBMITTED"
      ? "PASS"
      : "FAIL",
    {
      note: `incident=${incidentFinal?.app_status}; other=${otherFinal?.app_status}`,
    },
  );

  const failed = results.filter((r) => r.status !== "PASS");
  const verdict =
    failed.length === 0
      ? "PARTNER APPROVAL SERVER AAL2 REMEDIATION PASS — MOBILE V4 READINESS MAY RESUME — PRODUCTION UNTOUCHED"
      : "PARTNER APPROVAL SERVER AAL2 REMEDIATION BLOCKED";

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidence = {
    at: new Date().toISOString(),
    stagingRef: STAGING_REF,
    productionRef: PROD_REF,
    contractVersion: "vdb-backend-contract@0.2.0-rc.6",
    schemaVersion: SCHEMA_VERSION,
    migrationTip: tipVersion,
    incidentPrefix: `${INCIDENT_PREFIX}…`,
    doNotTouchPrefix: `${DO_NOT_TOUCH_PREFIX}…`,
    synthetic: {
      approveAppPrefix: maskId(appApproveId),
      rejectAppPrefix: maskId(appRejectId),
      marker: FIXTURE_MARKER,
    },
    operatorFingerprints: {
      admin: sha256Prefix(`${adminEmail}:ADMIN:${STAGING_REF}`),
      owner: sha256Prefix(`${roles.VDB_STAGING_OWNER_EMAIL}:OWNER:${STAGING_REF}`),
    },
    sibling,
    verifyRows,
    results,
    verdict,
  };
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "EVIDENCE.json"),
    JSON.stringify(evidence, null, 2) + "\n",
    "utf8",
  );

  const siblingMd = [
    "# Sibling AAL2 audit (staging)",
    "",
    `Staging: \`${STAGING_REF}\` — production \`${PROD_REF}\` untouched.`,
    "",
    "| RPC | AAL2 in body |",
    "| --- | --- |",
    ...(sibling || []).map(
      (r) =>
        `| \`${r.proname}\` | ${(r.has_aal2 === true || r.has_aal2 === "t") ? "YES" : "NO"} |`,
    ),
    "",
    `staff_set_partner_compliance_fixture remains staging-fixture / not AAL2-contracted.`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(EVIDENCE_DIR, "SIBLING_RPC_AAL2_AUDIT.md"), siblingMd, "utf8");

  const verdictMd = [
    "# Owner RC6 — Partner approval AAL2 remediation",
    "",
    `## Verdict`,
    "",
    "```text",
    verdict,
    "```",
    "",
    `At: ${evidence.at}`,
    `Staging: \`${STAGING_REF}\``,
    `Production: \`${PROD_REF}\` (untouched)`,
    `Contract: \`vdb-backend-contract@0.2.0-rc.6\``,
    `schemaVersion: \`${SCHEMA_VERSION}\``,
    "",
    "## Results",
    "",
    ...results.map((r) => `- **${r.status}** \`${r.name}\`${r.note ? ` — ${r.note}` : ""}`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(EVIDENCE_DIR, "VERDICT.md"), verdictMd, "utf8");

  console.log(`\nVERDICT: ${verdict}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(`RC6_EVIDENCE_FAILED: ${String(err?.message ?? err).slice(0, 300)}`);
  process.exit(1);
});
