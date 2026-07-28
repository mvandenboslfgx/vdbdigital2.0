/**
 * RC3 staging metadata backup + apply exactly four freeze migrations.
 * Staging qzekuvmgfekzsowdecyk only. Never prints tokens/secrets.
 */
import fs from "node:fs";
import path from "node:path";
import {
  FOUR,
  STAGING,
  PROD,
  EXPECTED_PRE_COUNT,
  EXPECTED_PRE_TIP,
  EXPECTED_POST_COUNT,
  EXPECTED_POST_TIP,
  EVIDENCE,
  ROOT,
  getCliToken,
  api,
  assertStagingIdentity,
  sql,
  verifyLocalFreeze,
  writeJson,
  ensureDir,
  sha256Text,
} from "./staging-rc3-apply-lib.js";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const mode = (process.argv[2] || "all").toLowerCase(); // backup | apply | all | verify

async function migrationState(token: string) {
  const migrations = (await sql(
    token,
    `SELECT version::text AS version, name::text AS name
     FROM supabase_migrations.schema_migrations ORDER BY version`,
  )) as Array<{ version: string; name: string }>;
  return {
    count: migrations.length,
    tip: migrations[migrations.length - 1]?.version,
    versions: migrations.map((m) => m.version),
    names: migrations,
    rc3: migrations.filter((m) => FOUR.some((f) => f.version === m.version)),
  };
}

async function financialIntegrity(token: string) {
  return (await sql(
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
       ) x) AS unbalanced_ledger,
       (SELECT count(*)::int FROM public.partner_profiles p
        WHERE public.partner_available_liability_cents(p.id) < 0) AS negative_liability`,
  )) as Array<Record<string, number>>;
}

async function createBackup(token: string) {
  await assertStagingIdentity(token);
  const freeze = verifyLocalFreeze();
  const mig = await migrationState(token);
  if (mig.count !== EXPECTED_PRE_COUNT || mig.tip !== EXPECTED_PRE_TIP) {
    throw new Error(`backup_precondition:${mig.count}/${mig.tip}`);
  }
  if (mig.rc3.length !== 0) throw new Error("rc3_already_present_at_backup");

  const backupsMeta = await api(
    token,
    "GET",
    `/v1/projects/${STAGING}/database/backups`,
  );
  if (backupsMeta.status !== 200) {
    throw new Error(`backups_meta_${backupsMeta.status}`);
  }
  const backupsJson = JSON.parse(backupsMeta.body) as {
    walg_enabled?: boolean;
    pitr_enabled?: boolean;
    region?: string;
  };

  const history = await api(
    token,
    "GET",
    `/v1/projects/${STAGING}/database/migrations`,
  );

  const objects = await sql(
    token,
    `SELECT n.nspname::text AS schema, c.relname::text AS name, c.relkind::text AS kind,
            c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname IN ('public','storage')
       AND c.relkind IN ('r','p','v','m')
       AND (
         c.relname LIKE 'portal_%'
         OR c.relname LIKE 'partner_%'
         OR c.relname IN ('feature_flags','categories','products','admin_roles','organization_members')
         OR n.nspname='storage'
       )
     ORDER BY 1,2`,
  );

  const policies = await sql(
    token,
    `SELECT schemaname::text, tablename::text, policyname::text, cmd::text, roles::text
     FROM pg_policies
     WHERE schemaname='public'
       AND (tablename LIKE 'portal_%' OR tablename LIKE 'partner_%' OR tablename='feature_flags')
     ORDER BY 1,2,3`,
  );

  const rpcs = await sql(
    token,
    `SELECT p.proname::text AS name,
            pg_get_function_identity_arguments(p.oid) AS args,
            p.prosecdef AS security_definer,
            coalesce(p.proconfig, ARRAY[]::text[]) AS config
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND (
         p.proname LIKE '%partner%'
         OR p.proname LIKE '%portal%'
         OR p.proname LIKE '%appointment%'
         OR p.proname LIKE '%support%'
         OR p.proname LIKE '%messaging%'
         OR p.proname LIKE '%feature_flag%'
       )
     ORDER BY 1,2`,
  );

  const storage = await sql(
    token,
    `SELECT id::text AS id, public AS is_public, file_size_limit, allowed_mime_types
     FROM storage.buckets ORDER BY id`,
  );

  const flags = await sql(
    token,
    `SELECT key::text AS key, enabled FROM public.feature_flags ORDER BY key`,
  );

  const auth = await sql(
    token,
    `SELECT
       (SELECT count(*)::int FROM auth.users) AS total_users,
       (SELECT count(*)::int FROM auth.users WHERE email_confirmed_at IS NOT NULL) AS confirmed,
       (SELECT count(*)::int FROM public.admin_roles) AS admin_role_rows,
       (SELECT count(DISTINCT user_id)::int FROM public.organization_members WHERE status='ACTIVE') AS active_customer_members,
       (SELECT count(*)::int FROM public.partner_profiles) AS partner_profiles`,
  );

  const financial = await financialIntegrity(token);

  const rowCounts = await sql(
    token,
    `SELECT
       (SELECT count(*)::int FROM public.portal_conversations) AS portal_conversations,
       (SELECT count(*)::int FROM public.portal_messages) AS portal_messages,
       (SELECT count(*)::int FROM public.portal_support_tickets) AS portal_support_tickets,
       (SELECT count(*)::int FROM public.portal_support_replies) AS portal_support_replies,
       (SELECT count(*)::int FROM public.portal_projects) AS portal_projects,
       (SELECT count(*)::int FROM public.portal_quotes) AS portal_quotes,
       (SELECT count(*)::int FROM public.portal_invoices) AS portal_invoices,
       (SELECT count(*)::int FROM public.partner_leads) AS partner_leads,
       (SELECT count(*)::int FROM public.partner_sales) AS partner_sales,
       (SELECT count(*)::int FROM public.partner_commissions) AS partner_commissions,
       (SELECT count(*)::int FROM public.partner_ledger_transactions) AS partner_ledger_transactions`,
  );

  const payload = {
    createdAtUtc: new Date().toISOString(),
    target: {
      project: "VDB Digital Staging",
      ref: STAGING,
      region: "eu-west-1",
      productionDenylist: PROD,
    },
    freeze,
    preApplyMigrations: mig,
    platformPhysicalBackup: {
      walg_enabled: backupsJson.walg_enabled === true,
      pitr_enabled: !!backupsJson.pitr_enabled,
      region: backupsJson.region,
      note: "No pg_dump forced; no password reset/link. WAL-G/PITR capability recorded; logical metadata snapshot below.",
    },
    migrationHistoryApi: (() => {
      try {
        return JSON.parse(history.body);
      } catch {
        return { status: history.status, bodyLen: history.body.length };
      }
    })(),
    objectInventory: objects,
    rlsPolicies: policies,
    rpcInventory: rpcs,
    storageBuckets: storage,
    featureFlags: flags,
    authUserCountsNoPii: auth,
    financialIntegrity: financial[0],
    rowCounts,
    rollback: {
      possible: [
        "Prefer Supabase PITR/physical restore for staging if apply fails mid-flight",
        "Forward-fix only for enum portal_ticket_status.NEW (cannot safely remove)",
        "REVOKE EXECUTE on new mutation RPCs if behaviour wrong; keep tables",
        "Leave RC3 feature flags false (fail-closed)",
      ],
      limitations: [
        "No full logical pg_dump in this gate (no DB password without Dashboard reset)",
        "Partial apply must STOP — do not repair history or invent versions",
        "Production nhsrdnjfsxfikfbdmdfj is denylisted — never restore/apply there from this gate",
      ],
    },
  };

  ensureDir(EVIDENCE);
  const backupName = `staging-rc3-pre-apply-backup-${TS}.json`;
  const backupPath = path.join(EVIDENCE, backupName);
  const body = JSON.stringify(payload, null, 2) + "\n";
  fs.writeFileSync(backupPath, body);
  const hash = sha256Text(body);
  const size = fs.statSync(backupPath).size;
  if (size < 500) throw new Error("backup_too_small");
  if (!backupsJson.walg_enabled) throw new Error("walg_not_enabled");

  const meta = {
    backupPath,
    backupSha256: hash,
    backupSize: size,
    createdAtUtc: payload.createdAtUtc,
    walgEnabled: true,
    pitrEnabled: !!backupsJson.pitr_enabled,
  };
  writeJson(`backup-verification-${TS}.json`, meta);
  writeJson("backup-verification-latest.json", meta);
  console.log(JSON.stringify({ phase: "backup", ...meta }, null, 2));
  return meta;
}

async function applyOne(
  token: string,
  version: string,
  filename: string,
  name: string,
) {
  await assertStagingIdentity(token);
  const exists = (await sql(
    token,
    `SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations WHERE version='${version}'`,
  )) as Array<{ n: number }>;
  if (exists[0]?.n !== 0) throw new Error(`already_applied:${version}`);

  const fp = path.join(ROOT, "supabase/migrations", filename);
  const content = fs.readFileSync(fp, "utf8").replace(/^\uFEFF/, "");
  await sql(token, content);

  const tag = `mig${version}`;
  if (content.includes(`$${tag}$`)) {
    throw new Error(`dollar_tag_collision:${version}`);
  }
  const insertSql = `
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '${version}',
  '${name}',
  ARRAY[$${tag}$${content}$${tag}$]::text[]
);
`;
  await sql(token, insertSql);

  const check = (await sql(
    token,
    `SELECT version::text AS version, name::text AS name, cardinality(statements)::int AS n
     FROM supabase_migrations.schema_migrations WHERE version='${version}'`,
  )) as Array<{ version: string; name: string; n: number }>;
  if (check.length !== 1 || check[0].name !== name) {
    throw new Error(`history_record_fail:${version}`);
  }
  return { version, name, recorded: true, statements: check[0].n };
}

async function postVerify(token: string) {
  const mig = await migrationState(token);
  const afterTip = mig.versions.filter((v) => v > EXPECTED_PRE_TIP);
  const unexpectedBeyond =
    afterTip.length !== 4 ||
    afterTip.join(",") !== FOUR.map((f) => f.version).join(",");

  const verifyRows = (await sql(
    token,
    `SELECT check_name::text AS check_name, ok, detail::text AS detail
     FROM public.verify_messaging_support_appointments_contracts()
     WHERE ok IS NOT TRUE`,
  )) as Array<{ check_name: string; ok: boolean; detail: string }>;

  const objects = (await sql(
    token,
    `SELECT
       to_regclass('public.portal_message_attachments') IS NOT NULL AS attachments,
       to_regclass('public.portal_appointments') IS NOT NULL AS appointments,
       to_regclass('public.portal_appointment_participants') IS NOT NULL AS participants,
       to_regprocedure('public.verify_messaging_support_appointments_contracts()') IS NOT NULL AS verify_rpc`,
  )) as Array<Record<string, boolean>>;

  const flags = (await sql(
    token,
    `SELECT key::text AS key, enabled FROM public.feature_flags
     WHERE key IN ('messaging_realtime','support_internal_notes_rpc','appointments_booking',
                   'digital_product_checkout','mollie_checkout','payments.mollie_checkout',
                   'payments.digital_goods_checkout')
     ORDER BY key`,
  )) as Array<{ key: string; enabled: boolean }>;

  const financial = await financialIntegrity(token);

  const result = {
    migrationCount: mig.count,
    tip: mig.tip,
    lastFour: mig.versions.slice(-4),
    unexpectedBeyondFour: unexpectedBeyond,
    unexpectedCount: unexpectedBeyond ? afterTip.length : 0,
    verifyFailRows: verifyRows,
    objects: objects[0],
    flags,
    financial: financial[0],
    contractExpected: {
      contractVersion: "vdb-backend-contract@0.2.0-rc.3",
      schemaVersion: "2026.07.25.messaging-support-appointments-rc3",
    },
  };

  const pass =
    mig.count === EXPECTED_POST_COUNT &&
    mig.tip === EXPECTED_POST_TIP &&
    !unexpectedBeyond &&
    verifyRows.length === 0 &&
    objects[0]?.attachments === true &&
    objects[0]?.appointments === true &&
    objects[0]?.participants === true &&
    objects[0]?.verify_rpc === true &&
    flags.every((f) => f.enabled === false) &&
    Object.values(financial[0] || {}).every((n) => n === 0);

  return { pass, result, mig };
}

async function applyAll(token: string, backupMeta: unknown) {
  verifyLocalFreeze();
  await assertStagingIdentity(token);
  const before = await migrationState(token);
  if (before.count !== EXPECTED_PRE_COUNT || before.tip !== EXPECTED_PRE_TIP) {
    throw new Error(`apply_precondition:${before.count}/${before.tip}`);
  }
  if (before.rc3.length !== 0) throw new Error("rc3_already_applied");

  const applied: unknown[] = [];
  for (const f of FOUR) {
    console.log(JSON.stringify({ applying: f.version, filename: f.filename }));
    try {
      const r = await applyOne(token, f.version, f.filename, f.name);
      applied.push(r);
      writeJson(`apply-${f.version}-result.json`, {
        ok: true,
        ...r,
        at: new Date().toISOString(),
      });
    } catch (e) {
      const err = {
        ok: false,
        version: f.version,
        error: String(e),
        appliedSoFar: applied,
        at: new Date().toISOString(),
      };
      writeJson(`apply-${f.version}-FAILED.json`, err);
      writeJson("apply-PARTIAL-STOP.json", err);
      console.error(JSON.stringify(err, null, 2));
      throw e;
    }
  }

  const verify = await postVerify(token);
  writeJson(`post-apply-verify-${TS}.json`, verify);
  writeJson("post-apply-verify-latest.json", verify);
  const summary = {
    at: new Date().toISOString(),
    backup: backupMeta,
    applied,
    verify,
    verdict: verify.pass
      ? "RC3 STAGING APPLY PASS"
      : "RC3 STAGING APPLY BLOCKED",
  };
  writeJson(`apply-summary-${TS}.json`, summary);
  writeJson("apply-summary-latest.json", summary);
  console.log(JSON.stringify(summary, null, 2));
  if (!verify.pass) process.exit(2);
  return summary;
}

async function main() {
  ensureDir(EVIDENCE);
  const token = getCliToken();
  if (!token || token.length < 20) throw new Error("token_missing");
  await assertStagingIdentity(token);

  if (mode === "backup") {
    await createBackup(token);
    return;
  }
  if (mode === "verify") {
    const v = await postVerify(token);
    writeJson("post-apply-verify-latest.json", v);
    console.log(JSON.stringify(v, null, 2));
    if (!v.pass) process.exit(2);
    return;
  }
  if (mode === "apply") {
    const backupMeta = JSON.parse(
      fs.readFileSync(
        path.join(EVIDENCE, "backup-verification-latest.json"),
        "utf8",
      ),
    );
    await applyAll(token, backupMeta);
    return;
  }
  // all
  const backupMeta = await createBackup(token);
  await applyAll(token, backupMeta);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
