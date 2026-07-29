/**
 * Guarded staging operator script — assign PRIMARY OWNER role.
 *
 * Preference B (no safe public role-assignment RPC exists):
 * - accepts ONLY staging ref qzekuvmgfekzsowdecyk
 * - hard-refuses production nhsrdnjfsxfikfbdmdfj and unknown refs
 * - fixed target email (not CLI-promotable)
 * - uses linked Supabase CLI SQL (no service-role in web/Mobile)
 * - never logs secrets / full UUIDs / passwords
 * - not imported from src/, Mobile, or browser code
 * - idempotent; writes audit without PII
 *
 * Usage (from repo root, CLI linked to staging):
 *   node scripts/staging/assign-primary-owner-staging.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";
const TARGET_EMAIL = "matthijsvandenbos8@gmail.com";
const LINKED_REF_PATH = path.join("supabase", ".temp", "project-ref");
const EVIDENCE_DIR = path.join(
  "docs",
  "artifacts",
  "owner-rc5-partner-directory-2026-07-29",
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  if (!local || !domain) return "[invalid]";
  return `${local.slice(0, 1)}***@${domain}`;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function readLinkedRef() {
  if (!fs.existsSync(LINKED_REF_PATH)) {
    throw new Error("BLOCKED: supabase/.temp/project-ref missing");
  }
  return fs.readFileSync(LINKED_REF_PATH, "utf8").trim();
}

function assertStagingOnly() {
  const linked = readLinkedRef();
  if (linked === PROD_REF) {
    throw new Error("BLOCKED: linked CLI ref is PRODUCTION — refusing write");
  }
  if (linked !== STAGING_REF) {
    throw new Error(
      `BLOCKED: linked CLI ref '${linked}' is not staging ${STAGING_REF}`,
    );
  }
  // Refuse accidental env override pointing at prod
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "STAGING_SUPABASE_URL",
    "SUPABASE_URL",
  ]) {
    const v = (process.env[key] || "").trim();
    if (!v) continue;
    if (v.includes(PROD_REF)) {
      throw new Error(`BLOCKED: ${key} points at production — refusing write`);
    }
    if (v && !v.includes(STAGING_REF) && key !== "SUPABASE_URL") {
      // STAGING/NEXT_PUBLIC must be staging when set
      if (key.startsWith("STAGING_") || key === "NEXT_PUBLIC_SUPABASE_URL") {
        throw new Error(`BLOCKED: ${key} is not staging host`);
      }
    }
  }
  if (process.env.APP_ENV && process.env.APP_ENV !== "staging") {
    throw new Error(`BLOCKED: APP_ENV=${process.env.APP_ENV} (expected staging)`);
  }
  return linked;
}

function linkedSqlJson(sql) {
  assertStagingOnly();
  const tmp = path.join(
    process.env.TEMP || process.env.TMP || "/tmp",
    `vdb-owner-assign-${Date.now()}.sql`,
  );
  fs.writeFileSync(tmp, sql, "utf8");
  try {
    const r = spawnSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-f", tmp, "-o", "json"],
      { encoding: "utf8", shell: true, cwd: path.resolve(__dirname, "..", "..") },
    );
    if (r.status !== 0) {
      const err = (r.stderr || r.stdout || "").slice(0, 500);
      throw new Error(`linked SQL failed: ${err}`);
    }
    const out = r.stdout || "";
    const start = out.indexOf("{");
    if (start < 0) throw new Error("linked SQL returned no JSON");
    return JSON.parse(out.slice(start));
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function main() {
  console.log("=== PRIMARY OWNER STAGING ASSIGNMENT ===");
  console.log(`target_email_masked=${maskEmail(TARGET_EMAIL)}`);
  const linked = assertStagingOnly();
  console.log(`staging_ref=${linked}`);
  console.log("method=guarded_staging_operator_script+linked_sql");

  // Pre-state
  const pre = linkedSqlJson(`
SELECT jsonb_build_object(
  'auth_exists', (u.id IS NOT NULL),
  'email_confirmed', (u.email_confirmed_at IS NOT NULL),
  'user_id_prefix', left(u.id::text, 8),
  'user_fingerprint', left(encode(digest(u.id::text, 'sha256'), 'hex'), 12),
  'profile_linked', (p.id IS NOT NULL),
  'profile_is_active', COALESCE(p.is_active, true),
  'previous_roles', COALESCE((
    SELECT jsonb_agg(ar.role::text ORDER BY ar.created_at)
    FROM public.admin_roles ar WHERE ar.user_id = u.id
  ), '[]'::jsonb),
  'banned', (u.banned_until IS NOT NULL AND u.banned_until > now())
) AS pre
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('${TARGET_EMAIL}');
`);
  const preRow = pre.rows?.[0]?.pre;
  if (!preRow?.auth_exists) {
    throw new Error("BLOCKED: target auth user missing on staging");
  }
  if (preRow.banned) {
    throw new Error("BLOCKED: target account is banned");
  }
  console.log(`pre_roles=${JSON.stringify(preRow.previous_roles)}`);
  console.log(`pre_profile_linked=${preRow.profile_linked}`);
  console.log(`user_fingerprint=${preRow.user_fingerprint}`);

  // Idempotent assignment: profile upsert + admin_roles OWNER upsert + audit
  // No email in audit metadata. Actor = service/operator script marker.
  const assign = linkedSqlJson(`
DO $$
DECLARE
  v_uid uuid;
  v_email text;
  v_prev text;
  v_audit uuid;
BEGIN
  SELECT id, email INTO v_uid, v_email
  FROM auth.users
  WHERE lower(email) = lower('${TARGET_EMAIL}')
  FOR UPDATE;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'TARGET_USER_MISSING';
  END IF;

  INSERT INTO public.profiles (id, email, is_active, updated_at)
  VALUES (v_uid, v_email, true, NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        is_active = true,
        updated_at = NOW();

  SELECT role::text INTO v_prev
  FROM public.admin_roles
  WHERE user_id = v_uid;

  INSERT INTO public.admin_roles (user_id, role, updated_at)
  VALUES (v_uid, 'OWNER', NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'OWNER',
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_uid,
    'admin.owner_role_assigned_staging',
    'admin_roles',
    left(v_uid::text, 8),
    jsonb_build_object(
      'method', 'guarded_staging_operator_script',
      'staging_ref', '${STAGING_REF}',
      'previous_role', COALESCE(v_prev, 'NONE'),
      'new_role', 'OWNER',
      'target_fingerprint', left(encode(digest(v_uid::text, 'sha256'), 'hex'), 12),
      'idempotent', (v_prev IS NOT DISTINCT FROM 'OWNER')
    )
  )
  RETURNING id INTO v_audit;

  RAISE NOTICE 'ASSIGN_OK audit_prefix=% prev=%', left(v_audit::text, 8), COALESCE(v_prev, 'NONE');
END $$;

SELECT jsonb_build_object(
  'primary_role', ar.role::text,
  'profile_linked', (p.id IS NOT NULL),
  'profile_is_active', COALESCE(p.is_active, true),
  'user_fingerprint', left(encode(digest(u.id::text, 'sha256'), 'hex'), 12),
  'user_id_prefix', left(u.id::text, 8),
  'role_row_count', (
    SELECT count(*)::int FROM public.admin_roles x WHERE x.user_id = u.id
  ),
  'is_admin_or_owner_shape', (ar.role IN ('OWNER', 'ADMIN')),
  'is_staff_shape', true,
  'mfa_verified_count', (
    SELECT count(*)::int FROM auth.mfa_factors f
    WHERE f.user_id = u.id AND f.status = 'verified'
  ),
  'latest_audit', (
    SELECT jsonb_build_object(
      'action', a.action,
      'audit_id_prefix', left(a.id::text, 8),
      'previous_role', a.metadata->>'previous_role',
      'new_role', a.metadata->>'new_role',
      'idempotent', a.metadata->>'idempotent'
    )
    FROM public.audit_logs a
    WHERE a.user_id = u.id
      AND a.action = 'admin.owner_role_assigned_staging'
    ORDER BY a.created_at DESC
    LIMIT 1
  ),
  'owner_admin_capabilities', jsonb_build_array(
    'dashboard.read',
    'work_queue.read',
    'directory.read',
    'settings.read',
    'security.read',
    'commission.approve',
    'commission.reject',
    'partner.suspend',
    'partner.reactivate'
  ),
  'flags', COALESCE((
    SELECT jsonb_object_agg(ff.key, ff.enabled)
    FROM public.feature_flags ff
    WHERE ff.key IN ('partner_payouts', 'support_internal_notes_rpc', 'partner_compliance_fixtures')
  ), '{}'::jsonb)
) AS post
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.admin_roles ar ON ar.user_id = u.id
WHERE lower(u.email) = lower('${TARGET_EMAIL}');
`);

  const post = assign.rows?.[0]?.post;
  if (!post || post.primary_role !== "OWNER") {
    throw new Error(
      `ASSIGN_FAILED: primary_role=${post?.primary_role ?? "MISSING"}`,
    );
  }
  if (post.role_row_count !== 1) {
    throw new Error(`ASSIGN_FAILED: conflicting role rows=${post.role_row_count}`);
  }

  console.log(`previous_role=${preRow.previous_roles?.[0] ?? "NONE"}`);
  console.log(`new_role=${post.primary_role}`);
  console.log(`profile_linked=${post.profile_linked}`);
  console.log(`profile_is_active=${post.profile_is_active}`);
  console.log(`role_row_count=${post.role_row_count}`);
  console.log(`mfa_verified_count=${post.mfa_verified_count}`);
  console.log(`audit=${JSON.stringify(post.latest_audit)}`);
  console.log(`capabilities=${JSON.stringify(post.owner_admin_capabilities)}`);
  console.log(`flags=${JSON.stringify(post.flags)}`);
  console.log("ASSIGNMENT_OK");

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const snap = {
    staging_ref: STAGING_REF,
    method: "guarded_staging_operator_script+linked_sql",
    target_email_masked: maskEmail(TARGET_EMAIL),
    previous_role: preRow.previous_roles?.[0] ?? "NONE",
    new_role: post.primary_role,
    user_fingerprint: post.user_fingerprint,
    user_id_prefix: post.user_id_prefix,
    profile_linked: post.profile_linked,
    profile_is_active: post.profile_is_active,
    role_row_count: post.role_row_count,
    mfa_verified_count: post.mfa_verified_count,
    capabilities: post.owner_admin_capabilities,
    audit: post.latest_audit,
    flags: post.flags,
    assigned_at: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "_assign_primary_owner_staging.json"),
    JSON.stringify(snap, null, 2),
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
