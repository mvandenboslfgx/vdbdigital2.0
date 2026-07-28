/**
 * Reproduce partner_financial_summary partner_id ambiguity on staging.
 * Never prints secrets.
 */
import {
  getCliToken,
  sql,
  assertStagingIdentity,
  STAGING,
  PROD,
  ensureDir,
  EVIDENCE,
} from "./staging-rc3-apply-lib.js";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(EVIDENCE, "partner-financial-summary-remediation");

async function main() {
  ensureDir(OUT);
  const token = getCliToken();
  const id = await assertStagingIdentity(token);
  const defRows = (await sql(
    token,
    `SELECT pg_get_functiondef('public.partner_financial_summary(uuid)'::regprocedure) AS def,
            pg_get_function_identity_arguments('public.partner_financial_summary(uuid)'::regprocedure) AS args`,
  )) as Array<{ def: string; args: string }>;

  let callError: string | null = null;
  let callOk: unknown = null;
  try {
    callOk = await sql(
      token,
      `SELECT * FROM public.partner_financial_summary(NULL::uuid)`,
    );
  } catch (e) {
    callError = String(e);
  }

  // Also try with an explicit partner uuid from staging (service role / no auth.uid)
  let callWithPidError: string | null = null;
  let samplePid: string | null = null;
  try {
    const p = (await sql(
      token,
      `SELECT id::text AS id FROM public.partner_profiles WHERE status='ACTIVE' ORDER BY created_at NULLS LAST LIMIT 1`,
    )) as Array<{ id: string }>;
    samplePid = p[0]?.id ?? null;
    if (samplePid) {
      await sql(
        token,
        `SELECT * FROM public.partner_financial_summary('${samplePid}'::uuid)`,
      );
    }
  } catch (e) {
    callWithPidError = String(e);
  }

  const report = {
    at: new Date().toISOString(),
    staging: { id: id.id, name: id.name, region: id.region },
    productionDenylist: PROD,
    signature: {
      identityArgs: defRows[0]?.args,
      returnsTableColumns: ["partner_id", "available_cents", "approved_commission_cents", "paid_payout_cents"],
      parameter: "p_partner_id uuid DEFAULT NULL",
    },
    definition: defRows[0]?.def,
    reproduce: {
      callNull: { ok: !callError, error: callError, result: callOk },
      callWithPid: {
        samplePidPresent: !!samplePid,
        ok: !callWithPidError,
        error: callWithPidError,
      },
    },
    rootCauseHypothesis:
      "PL/pgSQL RETURNS TABLE declares OUT variable partner_id; unqualified partner_id in subqueries on partner_commissions/partner_payouts is ambiguous with that OUT name.",
  };

  fs.writeFileSync(
    path.join(OUT, "reproduce.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        staging: STAGING,
        ambiguous:
          /ambiguous|partner_id/i.test(callError || "") ||
          /ambiguous|partner_id/i.test(callWithPidError || ""),
        callNullError: (callError || "").slice(0, 400),
        callWithPidError: (callWithPidError || "").slice(0, 400),
        hasReturnsPartnerId: /RETURNS TABLE[\s\S]*partner_id uuid/i.test(
          defRows[0]?.def || "",
        ),
        unqualifiedWhere: /WHERE partner_id = v_pid/i.test(defRows[0]?.def || ""),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
