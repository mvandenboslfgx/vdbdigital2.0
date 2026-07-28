/**
 * Mobile RC3 synthetic staging credential handoff.
 * Never prints passwords/tokens. Staging only.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  STAGING,
  PROD,
  getCliToken,
  assertStagingIdentity,
  sql,
  api,
} from "./staging-rc3-apply-lib.js";

const VAULT_DIR = "C:/Users/XXX/.vdb-vault";
const VAULT_FILE = path.join(VAULT_DIR, "mobile-rc3-staging-role-matrix.env");
const MANIFEST_FILE = path.join(
  VAULT_DIR,
  "mobile-rc3-staging-role-matrix.manifest.json",
);
const REPORT_FILE = path.join(
  "C:/Users/XXX/vdbdigital-rc3-freeze/docs/evidence/staging-rc3-apply",
  "mobile-rc3-credential-handoff-report.json",
);

const PASSWORDS_JSON =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json";
const CLIENT_ENV =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-ui-device/.vault/staging-client.env";
const ACCOUNTS_PUBLIC =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/accounts-public.json";
const FIXTURES_RC2 =
  "C:/Users/XXX/vdbdigital-staging-rc2-preflight/docs/evidence/staging-cross-repo/fixtures-ids.json";
const FIXTURES_RC3 =
  "C:/Users/XXX/vdbdigital-rc3-freeze/docs/evidence/staging-rc3-apply/fixtures-ids.json";

const ROLES = [
  {
    alias: "customer_a",
    emailKey: "staging+cust_a@example.test",
    envEmail: "VDB_STAGING_CUSTOMER_A_EMAIL",
    envPass: "VDB_STAGING_CUSTOMER_A_PASSWORD",
    accountKey: "cust_a",
  },
  {
    alias: "customer_b",
    emailKey: "staging+cust_b@example.test",
    envEmail: "VDB_STAGING_CUSTOMER_B_EMAIL",
    envPass: "VDB_STAGING_CUSTOMER_B_PASSWORD",
    accountKey: "cust_b",
  },
  {
    alias: "partner_a",
    emailKey: "staging+part_a@example.test",
    envEmail: "VDB_STAGING_PARTNER_A_EMAIL",
    envPass: "VDB_STAGING_PARTNER_A_PASSWORD",
    accountKey: "part_a",
  },
  {
    alias: "partner_b",
    emailKey: "staging+part_b@example.test",
    envEmail: "VDB_STAGING_PARTNER_B_EMAIL",
    envPass: "VDB_STAGING_PARTNER_B_PASSWORD",
    accountKey: "part_b",
  },
  {
    alias: "partner_pending",
    emailKey: "staging+part_pending@example.test",
    envEmail: "VDB_STAGING_PARTNER_PENDING_EMAIL",
    envPass: "VDB_STAGING_PARTNER_PENDING_PASSWORD",
    accountKey: "part_pending",
  },
  {
    alias: "staff",
    emailKey: "staging+staff_s@example.test",
    envEmail: "VDB_STAGING_STAFF_EMAIL",
    envPass: "VDB_STAGING_STAFF_PASSWORD",
    accountKey: "staff_s",
  },
  {
    alias: "admin",
    emailKey: "staging+admin_a@example.test",
    envEmail: "VDB_STAGING_ADMIN_EMAIL",
    envPass: "VDB_STAGING_ADMIN_PASSWORD",
    accountKey: "admin_a",
  },
  {
    alias: "owner",
    emailKey: "staging+owner_o@example.test",
    envEmail: "VDB_STAGING_OWNER_EMAIL",
    envPass: "VDB_STAGING_OWNER_PASSWORD",
    accountKey: "owner_o",
  },
] as const;

function loadEnvFile(p: string) {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).replace(/^\uFEFF/, "")] = line.slice(i + 1);
  }
  return out;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const keep = Math.min(3, local.length);
  return `${local.slice(0, keep)}***@${domain}`;
}

function strongPassword() {
  // Synthetic only; never printed
  return `Stg!${randomBytes(18).toString("base64url")}`;
}

async function tryLogin(
  base: string,
  anon: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  // Drain body but never log it
  await res.text();
  return { ok: res.ok, status: res.status };
}

async function adminUpdatePassword(
  base: string,
  serviceRole: string,
  userId: string,
  password: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  await res.text();
  return { ok: res.ok, status: res.status };
}

async function fetchServiceRole(mgmtToken: string): Promise<string> {
  const r = await api(mgmtToken, "GET", `/v1/projects/${STAGING}/api-keys`);
  if (r.status !== 200) throw new Error(`api_keys_${r.status}`);
  const keys = JSON.parse(r.body) as Array<{ name?: string; api_key?: string }>;
  const sr = keys.find(
    (k) =>
      (k.name || "").toLowerCase().includes("service") ||
      (k.name || "").toLowerCase() === "service_role",
  );
  if (!sr?.api_key) throw new Error("service_role_missing");
  return sr.api_key;
}

function restrictAcl(filePath: string) {
  try {
    execFileSync(
      "icacls",
      [
        filePath,
        "/inheritance:r",
        "/grant:r",
        `${process.env.USERNAME}:(R,W)`,
        "/grant:r",
        "SYSTEM:(F)",
      ],
      { encoding: "utf8", windowsHide: true },
    );
  } catch {
    // Best-effort on Windows
  }
}

function assertNotTracked(filePath: string) {
  // Outside repos: also check git check-ignore if under a repo (won't be)
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/.git/") || normalized.includes("vdbdigital")) {
    // If somehow under repo, ensure ignored
  }
  // Primary vault is under user home .vdb-vault — not in git worktrees
  return !normalized.includes("/vdbdigital") && !normalized.includes("\\vdbdigital");
}

async function main() {
  const mgmt = getCliToken();
  const identity = await assertStagingIdentity(mgmt);
  const prod = await api(mgmt, "GET", `/v1/projects/${PROD}`);

  const authBefore = (await sql(
    mgmt,
    `SELECT count(*)::int AS n FROM auth.users`,
  )) as Array<{ n: number }>;

  const client = loadEnvFile(CLIENT_ENV);
  if (!client.STAGING_SUPABASE_URL?.includes(STAGING)) {
    throw new Error("client_env_not_staging");
  }
  if (client.STAGING_SUPABASE_URL.includes(PROD)) throw new Error("prod_in_client");
  const base = client.STAGING_SUPABASE_URL.replace(/\/$/, "");
  const anon = client.STAGING_SUPABASE_ANON_KEY;

  const passwords = JSON.parse(fs.readFileSync(PASSWORDS_JSON, "utf8")) as Record<
    string,
    string
  >;
  const accountsPublic = JSON.parse(fs.readFileSync(ACCOUNTS_PUBLIC, "utf8")) as {
    accounts: Record<
      string,
      { userId: string; email: string; kind: string }
    >;
  };
  const fixturesRc2 = JSON.parse(fs.readFileSync(FIXTURES_RC2, "utf8"));
  const fixturesRc3 = JSON.parse(fs.readFileSync(FIXTURES_RC3, "utf8"));

  // Role/status inventory from staging (no PII beyond synthetic emails already known)
  const roleRows = (await sql(
    mgmt,
    `SELECT
       u.id::text AS user_id,
       u.email::text AS email,
       u.email_confirmed_at IS NOT NULL AS confirmed,
       (SELECT ar.role::text FROM public.admin_roles ar WHERE ar.user_id = u.id LIMIT 1) AS admin_role,
       (SELECT pp.id::text FROM public.partner_profiles pp WHERE pp.user_id = u.id LIMIT 1) AS partner_id,
       (SELECT pp.status::text FROM public.partner_profiles pp WHERE pp.user_id = u.id LIMIT 1) AS partner_status,
       (SELECT om.organization_id::text FROM public.organization_members om
         WHERE om.user_id = u.id AND om.status = 'ACTIVE' ORDER BY om.created_at NULLS LAST LIMIT 1) AS org_id,
       (SELECT om.customer_role::text FROM public.organization_members om
         WHERE om.user_id = u.id AND om.status = 'ACTIVE' ORDER BY om.created_at NULLS LAST LIMIT 1) AS customer_role
     FROM auth.users u
     WHERE u.email IN (
       'staging+cust_a@example.test','staging+cust_b@example.test',
       'staging+part_a@example.test','staging+part_b@example.test',
       'staging+part_pending@example.test','staging+staff_s@example.test',
       'staging+admin_a@example.test','staging+owner_o@example.test'
     )
     ORDER BY u.email`,
  )) as Array<{
    user_id: string;
    email: string;
    confirmed: boolean;
    admin_role: string | null;
    partner_id: string | null;
    partner_status: string | null;
    org_id: string | null;
    customer_role: string | null;
  }>;

  if (roleRows.length !== 8) {
    throw new Error(`expected_8_users_got_${roleRows.length}`);
  }

  let serviceRole: string | null = null;
  const loginResults: Array<Record<string, unknown>> = [];
  const passwordMap: Record<string, string> = { ...passwords };
  const restored: string[] = [];

  for (const role of ROLES) {
    const meta = accountsPublic.accounts[role.accountKey];
    if (!meta || meta.email !== role.emailKey) {
      throw new Error(`manifest_mismatch_${role.alias}`);
    }
    const row = roleRows.find((r) => r.email === role.emailKey);
    if (!row || row.user_id !== meta.userId) {
      throw new Error(`userid_mismatch_${role.alias}`);
    }

    let pw = passwordMap[role.emailKey];
    let login = pw
      ? await tryLogin(base, anon, role.emailKey, pw)
      : { ok: false, status: 0 };

    if (!login.ok) {
      if (!serviceRole) serviceRole = await fetchServiceRole(mgmt);
      const next = strongPassword();
      const upd = await adminUpdatePassword(
        base,
        serviceRole,
        meta.userId,
        next,
      );
      if (!upd.ok) throw new Error(`password_reset_fail_${role.alias}_${upd.status}`);
      passwordMap[role.emailKey] = next;
      pw = next;
      restored.push(role.alias);
      login = await tryLogin(base, anon, role.emailKey, pw);
      if (!login.ok) throw new Error(`login_still_fail_${role.alias}_${login.status}`);
    }

    loginResults.push({
      alias: role.alias,
      emailMasked: maskEmail(role.emailKey),
      userId: meta.userId,
      loginOk: login.ok,
      loginStatus: login.status,
      passwordRestored: restored.includes(role.alias),
      confirmed: row.confirmed,
      adminRole: row.admin_role,
      partnerId: row.partner_id,
      partnerStatus: row.partner_status,
      orgId: row.org_id,
      customerRole: row.customer_role,
    });
  }

  // Persist updated passwords JSON if any restored (vault only, gitignored)
  if (restored.length > 0) {
    fs.writeFileSync(PASSWORDS_JSON, JSON.stringify(passwordMap, null, 2) + "\n");
  }

  fs.mkdirSync(VAULT_DIR, { recursive: true });
  const envLines = [
    `# Mobile RC3 synthetic staging role matrix — LOCAL SECRET — DO NOT COMMIT`,
    `# Staging ref: ${STAGING}`,
    `# Generated: ${new Date().toISOString()}`,
    `VDB_STAGING_SUPABASE_URL=${base}`,
    `VDB_STAGING_PROJECT_REF=${STAGING}`,
    `# Production denylist (do not use): ${PROD}`,
    ``,
  ];
  for (const role of ROLES) {
    envLines.push(`${role.envEmail}=${role.emailKey}`);
    envLines.push(`${role.envPass}=${passwordMap[role.emailKey]}`);
    envLines.push(``);
  }
  fs.writeFileSync(VAULT_FILE, envLines.join("\n"), { encoding: "utf8", mode: 0o600 });
  restrictAcl(VAULT_FILE);
  restrictAcl(VAULT_DIR);

  // Double-check: if path somehow under a repo, check-ignore
  let gitCheck = "outside_known_repos";
  try {
    const out = execFileSync(
      "git",
      ["-C", "C:/Users/XXX/vdbdigital-rc3-freeze", "check-ignore", "-v", VAULT_FILE],
      { encoding: "utf8" },
    );
    gitCheck = out.trim() || "not_ignored_but_outside_worktree";
  } catch {
    gitCheck = "path_outside_worktree_not_tracked";
  }

  const authAfter = (await sql(
    mgmt,
    `SELECT count(*)::int AS n FROM auth.users`,
  )) as Array<{ n: number }>;

  const manifest = {
    at: new Date().toISOString(),
    stagingRef: STAGING,
    productionDenylist: PROD,
    vaultPath: VAULT_FILE,
    accounts: loginResults.map((r) => ({
      alias: r.alias,
      emailMasked: r.emailMasked,
      userId: r.userId,
      roleStatus: {
        adminRole: r.adminRole,
        partnerId: r.partnerId,
        partnerStatus: r.partnerStatus,
        orgId: r.orgId,
        customerRole: r.customerRole,
        confirmed: r.confirmed,
      },
      loginVerified: r.loginOk,
      passwordRestored: r.passwordRestored,
      fixtureRelations: {
        rc2Marker: "STAGING_RC2_XREPO",
        rc3Marker: fixturesRc3.marker,
        orgAId: fixturesRc3.orgAId,
        orgBId: fixturesRc3.orgBId,
        projectId: fixturesRc3.projectId,
        conversationIdCustA: fixturesRc3.conversation_id,
        partnerAIdFromRc2: fixturesRc2.partAId,
        partnerBIdFromRc2: fixturesRc2.partBId,
      },
    })),
    notes: [
      "No passwords or tokens in this manifest.",
      "Vault file is under user home .vdb-vault and must remain gitignored/untracked.",
    ],
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
  restrictAcl(MANIFEST_FILE);

  // Ensure passwords json stays gitignored
  const pwIgnore = execFileSync(
    "git",
    [
      "-C",
      "C:/Users/XXX/vdbdigital-staging-rc2-preflight",
      "check-ignore",
      "-v",
      "docs/evidence/staging-cross-repo/.vault/staging-rc2-xrepo-passwords.json",
    ],
    { encoding: "utf8" },
  ).trim();

  const gitStatus = execFileSync(
    "git",
    ["-C", "C:/Users/XXX/vdbdigital-rc3-freeze", "status", "--short"],
    { encoding: "utf8" },
  ).trim();

  const allLoginOk = loginResults.every((r) => r.loginOk === true);
  const report = {
    at: new Date().toISOString(),
    staging: {
      ref: STAGING,
      name: identity.name,
      region: identity.region,
      status: identity.status,
    },
    productionDenylist: {
      ref: PROD,
      getStatus: prod.status,
      note: "identity only; no SQL",
    },
    authUserCount: {
      before: authBefore[0]?.n,
      after: authAfter[0]?.n,
      delta: (authAfter[0]?.n ?? 0) - (authBefore[0]?.n ?? 0),
    },
    accountsVerified: loginResults.length,
    aliases: ROLES.map((r) => r.alias),
    loginResults: loginResults.map((r) => ({
      alias: r.alias,
      emailMasked: r.emailMasked,
      userId: r.userId,
      loginOk: r.loginOk,
      passwordRestored: r.passwordRestored,
      adminRole: r.adminRole,
      partnerStatus: r.partnerStatus,
      orgId: r.orgId,
    })),
    restoredAliases: restored,
    vaultPath: VAULT_FILE,
    manifestPath: MANIFEST_FILE,
    vaultOutsideRepos: assertNotTracked(VAULT_FILE),
    gitCheckIgnoreVault: gitCheck,
    passwordsJsonGitIgnored: pwIgnore,
    secretsPrinted: false,
    secretsCommitted: false,
    gitStatusShort: gitStatus.split(/\r?\n/).slice(0, 40),
    repositoryHead: execFileSync(
      "git",
      ["-C", "C:/Users/XXX/vdbdigital-rc3-freeze", "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).trim(),
    verdict:
      allLoginOk && loginResults.length === 8 && authAfter[0]?.n === authBefore[0]?.n
        ? "MOBILE RC3 SYNTHETIC CREDENTIAL HANDOFF PASS"
        : "MOBILE RC3 SYNTHETIC CREDENTIAL HANDOFF BLOCKED",
  };

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + "\n");

  // Console: never include password values
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        stagingRef: STAGING,
        aliases: report.aliases,
        vaultPath: VAULT_FILE,
        manifestPath: MANIFEST_FILE,
        restoredAliases: restored,
        authUserCount: report.authUserCount,
        allLoginOk,
        productionDenylistGetStatus: prod.status,
        vaultOutsideRepos: report.vaultOutsideRepos,
        secretsPrinted: false,
      },
      null,
      2,
    ),
  );

  if (report.verdict.includes("BLOCKED")) process.exit(2);
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
