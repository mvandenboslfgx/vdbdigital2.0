/**
 * Local reset + validate partner_financial_summary ambiguity fix.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const CONTAINER = "supabase_db_vdbdigital2";
const ROOT = process.cwd();
const MIG =
  "supabase/migrations/20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql";
const OUT = path.join(
  ROOT,
  "docs/evidence/staging-rc3-apply/partner-financial-summary-remediation",
);

function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-F",
      "\t",
      "-c",
      sql,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const running = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });
  if (!running.includes(CONTAINER)) throw new Error(`missing ${CONTAINER}`);

  console.log("LOCAL_RESET_START");
  execFileSync("npx", ["supabase", "db", "reset", "--yes"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  console.log("LOCAL_RESET_DONE");

  const tip = psql(
    `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;`,
  );
  const count = psql(`SELECT count(*)::text FROM supabase_migrations.schema_migrations;`);
  if (tip !== "20260728090000") throw new Error(`tip_mismatch:${tip}`);

  const def = psql(
    `SELECT pg_get_functiondef('public.partner_financial_summary(uuid)'::regprocedure);`,
  );
  if (!/c\.partner_id = v_pid/.test(def) || !/pay\.partner_id = v_pid/.test(def)) {
    throw new Error("fix_not_present_in_def");
  }
  if (/WHERE partner_id = v_pid/.test(def)) {
    throw new Error("unqualified_partner_id_still_present");
  }

  // Synthetic call as partner-like: set jwt and ensure no ambiguity error
  // Create minimal partner profile linked to a fake auth user already may exist from migrations/seeds
  // Use SECURITY bypass as postgres to set request.jwt and call
  const call = psql(`
DO $$
DECLARE
  uid uuid := gen_random_uuid();
  pid uuid;
  r record;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pfs.fix@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW());
  INSERT INTO public.profiles (id, email, full_name, is_active) VALUES (uid, 'pfs.fix@example.invalid', 'PFS Fix', TRUE);
  INSERT INTO public.partner_profiles (user_id, display_name, status) VALUES (uid, 'PFS Fix Partner', 'ACTIVE') RETURNING id INTO pid;
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SELECT * INTO r FROM public.partner_financial_summary(NULL);
  IF r.partner_id IS DISTINCT FROM pid THEN RAISE EXCEPTION 'pid_mismatch'; END IF;
  RAISE NOTICE 'local_call_ok partner=% available=%', r.partner_id, r.available_cents;
END $$;
SELECT 'ok';
`);

  const migHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, MIG)))
    .digest("hex");

  const report = {
    at: new Date().toISOString(),
    localReset: true,
    migrationCount: Number(count),
    tip,
    migrationFile: MIG,
    migrationSha256: migHash,
    localCall: call,
    defHasQualifiedColumns: true,
  };
  fs.writeFileSync(path.join(OUT, "local-reset-validation.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main();
