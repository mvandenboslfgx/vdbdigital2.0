/**
 * RC3 staging preflight (read-only). Staging only. Never prints tokens.
 */
import { execFileSync } from "node:child_process";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const STAGING = "qzekuvmgfekzsowdecyk";
const PROD = "nhsrdnjfsxfikfbdmdfj";
const EXPECTED_HEAD = "c55abc6c8c6a125f8d475717a8cc973fd22e00ec";
const EXPECTED_BUNDLE =
  "62bb1c31240f5eb7e16968a6a03d425e52f2c2ef8b09c38c6cbd549ed331973f";
const EXPECTED_MANIFEST =
  "a82762cbaf851b51c8ee4192b316a821392943b983f8f057a26c7f3ff41ce216";
const EXPECTED_TIP = "20260724190000";
const EXPECTED_COUNT = 42;
const FOUR = [
  {
    version: "20260725120000",
    filename: "20260725120000_messaging_support_appointments_rc3.sql",
    sha256:
      "2a7bda8f49310bf1a24a73d227e984fe12d701f4c6b6394171d10ec91de88fc9",
  },
  {
    version: "20260725120100",
    filename: "20260725120100_messaging_support_appointments_rc3_rpcs.sql",
    sha256:
      "364f4c4e27674e4052aa092b260b05f872cfc962a46bf072326d4aabd10cab65",
  },
  {
    version: "20260725120200",
    filename: "20260725120200_fix_appointment_rls_recursion.sql",
    sha256:
      "37aa246f07bf4100ece20d12b425c85dd1ddb96cf76d720be2e96a52bd47968b",
  },
  {
    version: "20260725120300",
    filename: "20260725120300_rc3_table_grants.sql",
    sha256:
      "786919a0b3267c5eb8ed2ef1073e7c9916063593c168d77ba933891fd727ed00",
  },
] as const;

const ROOT = process.cwd();
const EVIDENCE = path.join(ROOT, "docs/evidence/staging-rc3-apply");

function getCliToken(): string {
  const ps1 = path.join(EVIDENCE, ".vault", "_cred_read.ps1");
  return execFileSync("powershell.exe", ["-NoProfile", "-File", ps1], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function api(
  token: string,
  method: string,
  apiPath: string,
  body?: unknown,
): Promise<{ status: number; body: string }> {
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

async function assertStaging(token: string) {
  const r = await api(token, "GET", `/v1/projects/${STAGING}`);
  if (r.status !== 200) throw new Error(`identity_http_${r.status}`);
  const j = JSON.parse(r.body) as {
    id: string;
    name: string;
    region: string;
    status: string;
  };
  if (j.id !== STAGING) throw new Error("denylist_fail");
  if ((j.id as string) === PROD) throw new Error("production_denylist");
  if (j.name !== "VDB Digital Staging") throw new Error("name_mismatch");
  if (j.region !== "eu-west-1") throw new Error("region_mismatch");
  return j;
}

async function sql(token: string, query: string): Promise<unknown> {
  await assertStaging(token);
  const r = await api(token, "POST", `/v1/projects/${STAGING}/database/query`, {
    query,
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`SQL_HTTP_${r.status}:${r.body.slice(0, 800)}`);
  }
  return JSON.parse(r.body);
}

function sha256File(fp: string) {
  return createHash("sha256").update(fs.readFileSync(fp)).digest("hex");
}

function localIdentity() {
  const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const tag = execFileSync(
    "git",
    ["rev-parse", "shared-backend-rc3-local-freeze^{}"],
    { encoding: "utf8" },
  ).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  const dirtyLines = dirty ? dirty.split("\n").filter(Boolean) : [];
  const trackedDirty = dirtyLines.filter((l) => !l.startsWith("??"));
  const linked = fs.existsSync(path.join(ROOT, "supabase/.temp/project-ref"))
    ? fs
        .readFileSync(path.join(ROOT, "supabase/.temp/project-ref"), "utf8")
        .trim()
    : "NO_PROJECT_REF";
  return {
    toplevel,
    branch,
    head,
    tag,
    dirtyLines: dirtyLines.length,
    trackedDirty: trackedDirty.length,
    linked,
  };
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const local = localIdentity();
  const bundle = fs
    .readFileSync(
      path.join(
        ROOT,
        "contracts/releases/vdb-backend-contract-0.2.0-rc.3/BUNDLE_SHA256.txt",
      ),
      "utf8",
    )
    .trim();
  const manifestHash = createHash("sha256")
    .update(
      fs.readFileSync(
        path.join(
          ROOT,
          "contracts/releases/vdb-backend-contract-0.2.0-rc.3/migration-manifest.json",
        ),
      ),
    )
    .digest("hex");
  const migrationHashes = FOUR.map((f) => {
    const fp = path.join(ROOT, "supabase/migrations", f.filename);
    const disk = sha256File(fp);
    return { ...f, disk, match: disk === f.sha256 };
  });

  const gates = {
    worktree:
      local.toplevel.replace(/\\/g, "/") ===
      "C:/Users/XXX/vdbdigital-rc3-freeze",
    branch: local.branch === "freeze/shared-backend-rc3-local",
    head: local.head === EXPECTED_HEAD,
    tag: local.tag === EXPECTED_HEAD,
    cleanTracked: local.trackedDirty === 0,
    checkoutDisabledLinked: local.linked === "NO_PROJECT_REF" || local.linked === STAGING,
    bundle: bundle === EXPECTED_BUNDLE,
    manifest: manifestHash === EXPECTED_MANIFEST,
    migrationFiles: migrationHashes.every((m) => m.match),
  };

  const token = getCliToken();
  if (!token || token.length < 20) throw new Error("token_missing");
  const identity = await assertStaging(token);

  const migrations = (await sql(
    token,
    `SELECT version::text AS version, name::text AS name
     FROM supabase_migrations.schema_migrations ORDER BY version`,
  )) as Array<{ version: string; name: string }>;
  const count = migrations.length;
  const tip = migrations[migrations.length - 1]?.version;
  const rc3Applied = migrations.filter((m) =>
    FOUR.some((f) => f.version === m.version),
  );
  const pending = FOUR.map((f) => f.version).filter(
    (v) => !migrations.some((m) => m.version === v),
  );

  const flags = (await sql(
    token,
    `SELECT key::text AS key, enabled
     FROM public.feature_flags
     WHERE key ILIKE '%checkout%'
        OR key ILIKE '%mollie%'
        OR key ILIKE '%p0%5%'
        OR key ILIKE '%p05%'
        OR key IN (
          'messaging_realtime','support_internal_notes_rpc','appointments_booking',
          'partner_payouts','checkout_release','mollie_live'
        )
     ORDER BY key`,
  )) as Array<{ key: string; enabled: boolean }>;

  const objects = (await sql(
    token,
    `SELECT
       to_regclass('public.portal_conversations') IS NOT NULL AS portal_conversations,
       to_regclass('public.portal_messages') IS NOT NULL AS portal_messages,
       to_regclass('public.portal_support_tickets') IS NOT NULL AS portal_support_tickets,
       to_regclass('public.portal_message_attachments') IS NOT NULL AS portal_message_attachments,
       to_regclass('public.portal_appointments') IS NOT NULL AS portal_appointments,
       to_regclass('public.portal_appointment_participants') IS NOT NULL AS portal_appointment_participants,
       to_regprocedure('public.verify_messaging_support_appointments_contracts()') IS NOT NULL AS verify_rpc`,
  )) as Array<Record<string, boolean>>;

  const financial = (await sql(
    token,
    `SELECT
       (SELECT count(*)::int FROM (
          SELECT partner_lead_id FROM public.partner_sales
          WHERE partner_lead_id IS NOT NULL
          GROUP BY partner_lead_id HAVING count(*)>1) d) AS duplicate_lead_groups,
       (SELECT count(*)::int FROM (
          SELECT partner_sale_id FROM public.partner_commissions
          GROUP BY partner_sale_id HAVING count(*)>1) d) AS duplicate_commissions,
       (SELECT count(*)::int FROM (
          SELECT idempotency_key FROM public.partner_ledger_transactions
          GROUP BY idempotency_key HAVING count(*)>1) d) AS duplicate_ledger_events,
       (SELECT count(*)::int FROM (
          SELECT t.id FROM public.partner_ledger_transactions t
          JOIN public.partner_ledger_entries e ON e.transaction_id=t.id
          GROUP BY t.id HAVING sum(e.debit_cents)<>sum(e.credit_cents)
       ) x) AS unbalanced_ledger`,
  )) as Array<Record<string, number>>;

  const remoteGates = {
    identityOk: identity.id === STAGING,
    migrationCount: count === EXPECTED_COUNT,
    tip: tip === EXPECTED_TIP,
    rc3Absent: rc3Applied.length === 0,
    pendingExactFour:
      pending.length === 4 &&
      pending.join(",") === FOUR.map((f) => f.version).join(","),
    rc3ObjectsAbsent:
      objects[0]?.portal_message_attachments === false &&
      objects[0]?.portal_appointments === false &&
      objects[0]?.portal_appointment_participants === false &&
      objects[0]?.verify_rpc === false,
    baselinePresent:
      objects[0]?.portal_conversations === true &&
      objects[0]?.portal_messages === true &&
      objects[0]?.portal_support_tickets === true,
    financialClean: Object.values(financial[0] || {}).every((n) => n === 0),
    flagsFailClosed: flags.every((f) => {
      const sensitive =
        /checkout|mollie|p0.?5|messaging_realtime|support_internal|appointments_booking/i.test(
          f.key,
        );
      return !sensitive || f.enabled === false;
    }),
  };

  const pass =
    Object.values(gates).every(Boolean) &&
    Object.values(remoteGates).every(Boolean);

  const report = {
    at: new Date().toISOString(),
    verdict: pass
      ? "RC3 STAGING PREFLIGHT PASS — READY TO BACKUP/APPLY"
      : "RC3 STAGING PREFLIGHT BLOCKED",
    local,
    hashes: { bundle, manifestHash, migrationHashes },
    gates,
    identity: {
      id: identity.id,
      name: identity.name,
      region: identity.region,
      status: identity.status,
      productionDenylist: PROD,
    },
    migrations: {
      count,
      tip,
      rc3Applied: rc3Applied.map((m) => m.version),
      pending,
      last5: migrations.slice(-5),
    },
    objects: objects[0],
    flags,
    financial: financial[0],
    remoteGates,
  };

  const out = path.join(EVIDENCE, "preflight.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exit(2);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
