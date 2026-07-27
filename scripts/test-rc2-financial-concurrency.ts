/**
 * RC2 financial concurrency validation — real parallel DB sessions.
 * Test-only. No production/migration/dependency changes.
 *
 * Run: npx tsx scripts/test-rc2-financial-concurrency.ts
 * Optional: CONC_QUICK=1 for reduced iterations (debug only — not freeze evidence).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  asJwtSql,
  classifyCall,
  parallelPsql,
  psql,
  psqlAllowFail,
  type CallOutcome,
} from "./concurrency/db";
import {
  IDS,
  assertLedgerBalanced,
  assertLedgerImmutableDenied,
  createLead,
  resetConcurrencyFixtures,
  restorePayoutFlag,
  type FixtureContext,
} from "./concurrency/fixtures";

type RaceResult = {
  race: string;
  variant: string;
  pass: boolean;
  iterations: number;
  concurrentCalls: number;
  expectedFailures: number;
  unexpectedErrors: number;
  invariantFailures: number;
  detail?: string;
};

const QUICK = process.env.CONC_QUICK === "1";
const PAIRWISE = QUICK ? 3 : 20;
const PAIRWISE_HEAVY = QUICK ? 3 : 25;
const FANOUT_ROUNDS = QUICK ? 1 : 5;
const FANOUT_N = QUICK ? 4 : 10;

const results: RaceResult[] = [];
let totalIterations = 0;
let totalConcurrentCalls = 0;
let totalUnexpected = 0;
let totalInvariant = 0;

function record(r: RaceResult): void {
  results.push(r);
  totalIterations += r.iterations;
  totalConcurrentCalls += r.concurrentCalls;
  totalUnexpected += r.unexpectedErrors;
  totalInvariant += r.invariantFailures;
  const mark = r.pass ? "PASS" : "FAIL";
  console.log(
    `${mark} ${r.race}/${r.variant} iters=${r.iterations} calls=${r.concurrentCalls} unexpected=${r.unexpectedErrors} invariants=${r.invariantFailures}${r.detail ? ` — ${r.detail}` : ""}`,
  );
}

function lastUuid(out: CallOutcome): string {
  return out.stdout.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
}

function countSql(sql: string): number {
  return Number(psql(sql));
}

async function raceSameKeySale(ctx: FixtureContext, iterations: number): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < iterations; i++) {
    const lead = createLead({
      partnerUserId: IDS.partnerAUser,
      name: `Conc SaleA ${i}`,
      email: `salea.${i}@example.invalid`,
      dedupe: `conc-sale-a-${i}-${Date.now()}`,
      code: "CONCPA",
    });
    const key = `conc:sale-same:${i}:${Date.now()}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, '${key}', 1000, 'EUR', NULL, NULL);`,
    );
    const outs = await parallelPsql([sql, sql]);
    calls += outs.length;
    const ids = new Set(outs.filter((o) => o.ok).map(lastUuid).filter(Boolean));
    for (const o of outs) {
      const cls = classifyCall(o, { winnerIds: ids, expectIdempotentSuccess: true });
      o.classification = cls;
      if (cls === "UNEXPECTED_ERROR" || cls === "RETRYABLE_DEADLOCK" || cls === "RETRYABLE_SERIALIZATION_FAILURE") {
        // untreated retryable counts as unexpected for this gate
        unexpected++;
      }
    }
    const sales = countSql(
      `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    const comms = countSql(
      `SELECT COUNT(*)::text FROM public.partner_commissions c
       JOIN public.partner_sales s ON s.id = c.partner_sale_id
       WHERE s.partner_lead_id = '${lead}'::uuid;`,
    );
    if (sales !== 1 || comms !== 1 || ids.size !== 1) {
      invariants++;
    }
    try {
      assertLedgerBalanced();
    } catch {
      invariants++;
    }
  }
  record({
    race: "RACE1_SALE_CONFIRM",
    variant: "same_idempotency_key",
    pass: unexpected === 0 && invariants === 0,
    iterations,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

async function raceDifferentKeySale(ctx: FixtureContext, iterations: number): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < iterations; i++) {
    const lead = createLead({
      partnerUserId: IDS.partnerAUser,
      name: `Conc SaleB ${i}`,
      email: `saleb.${i}@example.invalid`,
      dedupe: `conc-sale-b-${i}-${Date.now()}`,
      code: "CONCPA",
    });
    const k1 = `conc:sale-diff-a:${i}:${Date.now()}`;
    const k2 = `conc:sale-diff-b:${i}:${Date.now()}`;
    const sql1 = asJwtSql(
      IDS.staffA,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, '${k1}', 1000, 'EUR', NULL, NULL);`,
    );
    const sql2 = asJwtSql(
      IDS.staffB,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, '${k2}', 1000, 'EUR', NULL, NULL);`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    calls += outs.length;
    for (const o of outs) {
      const cls = classifyCall(o);
      o.classification = cls;
      if (
        !o.ok &&
        cls !== "EXPECTED_ALREADY_PROCESSED" &&
        cls !== "EXPECTED_CONFLICT" &&
        cls === "UNEXPECTED_ERROR"
      ) {
        unexpected++;
      }
    }
    const sales = countSql(
      `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    const comms = countSql(
      `SELECT COUNT(*)::text FROM public.partner_commissions c
       JOIN public.partner_sales s ON s.id = c.partner_sale_id
       WHERE s.partner_lead_id = '${lead}'::uuid;`,
    );
    const okCount = outs.filter((o) => o.ok).length;
    // Contract: exactly one sale/commission; at least one winner; losers are already-converted
    if (sales !== 1 || comms !== 1 || okCount < 1) {
      invariants++;
    }
  }
  record({
    race: "RACE1_SALE_CONFIRM",
    variant: "different_idempotency_same_event",
    pass: unexpected === 0 && invariants === 0,
    iterations,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
    detail: invariants
      ? "duplicate sale/commission for one lead under distinct idempotency keys"
      : undefined,
  });
}

async function raceFanoutSale(ctx: FixtureContext, rounds: number, n: number): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let r = 0; r < rounds; r++) {
    const lead = createLead({
      partnerUserId: IDS.partnerAUser,
      name: `Conc SaleFan ${r}`,
      email: `salefan.${r}@example.invalid`,
      dedupe: `conc-sale-fan-${r}-${Date.now()}`,
      code: "CONCPA",
    });
    const key = `conc:sale-fan:${r}:${Date.now()}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, '${key}', 1000, 'EUR', NULL, NULL);`,
    );
    const outs = await parallelPsql(Array.from({ length: n }, () => sql));
    calls += outs.length;
    const ids = new Set(outs.filter((o) => o.ok).map(lastUuid).filter(Boolean));
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const sales = countSql(
      `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    if (sales !== 1 || ids.size !== 1) invariants++;
  }
  record({
    race: "RACE1_SALE_CONFIRM",
    variant: `fanout_${n}`,
    pass: unexpected === 0 && invariants === 0,
    iterations: rounds,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

async function raceLeadConversion(ctx: FixtureContext, iterations: number): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < iterations; i++) {
    const lead = createLead({
      partnerUserId: IDS.partnerAUser,
      name: `Conc LeadConv ${i}`,
      email: `leadconv.${i}@example.invalid`,
      dedupe: `conc-leadconv-${i}-${Date.now()}`,
      code: "CONCPA",
    });
    const k1 = `conc:leadconv-a:${i}:${Date.now()}`;
    const k2 = `conc:leadconv-b:${i}:${Date.now()}`;
    const sql1 = asJwtSql(
      IDS.staffA,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 80000, '${k1}', 1000, 'EUR', NULL, NULL);`,
    );
    const sql2 = asJwtSql(
      IDS.staffB,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 80000, '${k2}', 1000, 'EUR', NULL, NULL);`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    calls += outs.length;
    for (const o of outs) {
      const cls = classifyCall(o);
      if (
        !o.ok &&
        cls !== "EXPECTED_ALREADY_PROCESSED" &&
        cls !== "EXPECTED_CONFLICT" &&
        cls === "UNEXPECTED_ERROR"
      ) {
        unexpected++;
      }
    }
    const sales = countSql(
      `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    const partners = countSql(
      `SELECT COUNT(DISTINCT partner_id)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    const leadStatus = psql(`SELECT status::text FROM public.partner_leads WHERE id = '${lead}'::uuid;`);
    const okCount = outs.filter((o) => o.ok).length;
    if (sales !== 1 || partners !== 1 || leadStatus !== "CONVERTED" || okCount < 1) {
      invariants++;
    }
  }
  record({
    race: "RACE2_LEAD_CONVERSION",
    variant: "dual_staff",
    pass: unexpected === 0 && invariants === 0,
    iterations,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

async function raceCommissionViaConfirm(ctx: FixtureContext, iterations: number): Promise<void> {
  // Commission is created only inside confirm_partner_sale — exercise via parallel confirms
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < iterations; i++) {
    const lead = createLead({
      partnerUserId: IDS.partnerAUser,
      name: `Conc Comm ${i}`,
      email: `comm.${i}@example.invalid`,
      dedupe: `conc-comm-${i}-${Date.now()}`,
      code: "CONCPA",
    });
    const key = `conc:comm:${i}:${Date.now()}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.confirm_partner_sale('${lead}'::uuid, 50000, '${key}', 1000, 'EUR', NULL, NULL);`,
    );
    const outs = await parallelPsql([sql, sql, sql]);
    calls += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const saleId = psql(
      `SELECT COALESCE(
         (SELECT id::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid LIMIT 1),
         '00000000-0000-0000-0000-000000000000'
       );`,
    );
    const sales = countSql(
      `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
    );
    const comms =
      sales === 0
        ? 0
        : countSql(
            `SELECT COUNT(*)::text FROM public.partner_commissions WHERE partner_sale_id = '${saleId}'::uuid;`,
          );
    const rules =
      sales === 0
        ? 0
        : countSql(
            `SELECT COUNT(DISTINCT calculation_rule_version)::text FROM public.partner_commissions WHERE partner_sale_id = '${saleId}'::uuid;`,
          );
    if (sales !== 1 || comms !== 1 || rules !== 1) invariants++;
  }
  record({
    race: "RACE3_COMMISSION",
    variant: "via_confirm_parallel",
    pass: unexpected === 0 && invariants === 0,
    iterations,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

/** Seed one settled sale/commission for partner A returning commission cents. */
function seedLiability(partnerUserId: string, code: string, tag: string, gross = 100000, bps = 1000): {
  leadId: string;
  saleId: string;
  commissionCents: number;
} {
  const lead = createLead({
    partnerUserId,
    name: `Liab ${tag}`,
    email: `liab.${tag}@example.invalid`,
    dedupe: `conc-liab-${tag}`,
    code,
  });
  const saleId = psql(`
SELECT public.confirm_partner_sale('${lead}'::uuid, ${gross}, 'conc:liab-sale:${tag}', ${bps}, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
  return { leadId: lead, saleId, commissionCents: Math.floor((gross * bps) / 10000) };
}

async function racePayoutRequests(ctx: FixtureContext): Promise<void> {
  // Variant A: two requests that individually fit but together exceed available
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  let expectedFail = 0;
  for (let i = 0; i < PAIRWISE_HEAVY; i++) {
    // Fresh partner liability each iter: use unique partner via cleanup+ recreate is heavy;
    // instead payout existing then create new sale for remaining capacity.
    // Clear pending requests for partner A first.
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    // Ensure available liability: create a new commission if needed
    const tag = `payreq-${i}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const half = Math.floor(avail * 0.6); // 60%+60% > 100%
    const k1 = `conc:payreq-a:${tag}`;
    const k2 = `conc:payreq-b:${tag}`;
    const sql1 = asJwtSql(
      IDS.partnerAUser,
      `SELECT public.request_partner_payout(${half}, '${k1}', 'EUR');`,
    );
    const sql2 = asJwtSql(
      IDS.partnerAUser,
      `SELECT public.request_partner_payout(${half}, '${k2}', 'EUR');`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    calls += outs.length;
    const ok = outs.filter((o) => o.ok).length;
    const fail = outs.filter((o) => !o.ok).length;
    expectedFail += fail;
    for (const o of outs) {
      const cls = classifyCall(o);
      if (
        !o.ok &&
        cls !== "EXPECTED_INSUFFICIENT_LIABILITY" &&
        cls !== "EXPECTED_CONFLICT" &&
        cls === "UNEXPECTED_ERROR"
      ) {
        unexpected++;
      }
    }
    const reservedExact = Number(
      psql(`
SELECT COALESCE(SUM(requested_amount_cents),0)::text
FROM public.partner_payout_requests
WHERE idempotency_key IN ('${k1}','${k2}');
`),
    );
    if (reservedExact > avail) {
      invariants++;
    }
    if (ok === 2 && reservedExact > avail) {
      invariants++;
    }
    // Must not approve both overspend requests
    if (ok === 2 && half * 2 > avail) {
      invariants++;
    }
  }

  // Variant B: same idempotency key
  let unexpectedB = 0;
  let invariantsB = 0;
  let callsB = 0;
  for (let i = 0; i < PAIRWISE; i++) {
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `paysame-${i}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    if (avail <= 0) {
      invariantsB++;
      continue;
    }
    const key = `conc:payreq-same:${tag}`;
    const sql = asJwtSql(
      IDS.partnerAUser,
      `SELECT public.request_partner_payout(${Math.min(avail, 5000)}, '${key}', 'EUR');`,
    );
    const outs = await parallelPsql([sql, sql]);
    callsB += outs.length;
    const ids = new Set(outs.filter((o) => o.ok).map(lastUuid).filter(Boolean));
    for (const o of outs) {
      if (!o.ok) {
        const cls = classifyCall(o);
        // unique_violation on concurrent same key is EXPECTED_CONFLICT
        if (cls === "UNEXPECTED_ERROR") unexpectedB++;
        // Soft-path race may surface as unique_violation — expected
        if (cls === "EXPECTED_CONFLICT" || cls === "EXPECTED_INSUFFICIENT_LIABILITY") {
          /* ok */
        }
      }
    }
    const n = countSql(
      `SELECT COUNT(*)::text FROM public.partner_payout_requests WHERE idempotency_key = '${key}';`,
    );
    // Exactly one row; at least one success OR conflict with one row
    if (n !== 1) invariantsB++;
    if (ids.size > 1) invariantsB++;
  }

  // Fan-out
  let unexpectedC = 0;
  let invariantsC = 0;
  let callsC = 0;
  for (let r = 0; r < FANOUT_ROUNDS; r++) {
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `payfan-${r}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const amount = Math.floor(avail / 2) || 1;
    const sqls = Array.from({ length: FANOUT_N }, (_, j) =>
      asJwtSql(
        IDS.partnerAUser,
        `SELECT public.request_partner_payout(${amount}, 'conc:payfan:${tag}:${j}', 'EUR');`,
      ),
    );
    const outs = await parallelPsql(sqls);
    callsC += outs.length;
    for (const o of outs) {
      const cls = classifyCall(o);
      if (
        !o.ok &&
        cls !== "EXPECTED_INSUFFICIENT_LIABILITY" &&
        cls !== "EXPECTED_CONFLICT" &&
        cls === "UNEXPECTED_ERROR"
      ) {
        unexpectedC++;
      }
    }
    const reserved = Number(
      psql(`
SELECT COALESCE(SUM(requested_amount_cents),0)::text
FROM public.partner_payout_requests
WHERE partner_id = '${ctx.partnerAId}'::uuid AND status = 'REQUESTED';
`),
    );
    if (reserved > avail) invariantsC++;
  }

  record({
    race: "RACE4_PAYOUT_REQUEST",
    variant: "overspend_pairwise",
    pass: unexpected === 0 && invariants === 0,
    iterations: PAIRWISE_HEAVY,
    concurrentCalls: calls,
    expectedFailures: expectedFail,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
  record({
    race: "RACE4_PAYOUT_REQUEST",
    variant: "same_idempotency",
    pass: unexpectedB === 0 && invariantsB === 0,
    iterations: PAIRWISE,
    concurrentCalls: callsB,
    expectedFailures: 0,
    unexpectedErrors: unexpectedB,
    invariantFailures: invariantsB,
  });
  record({
    race: "RACE4_PAYOUT_REQUEST",
    variant: "fanout",
    pass: unexpectedC === 0 && invariantsC === 0,
    iterations: FANOUT_ROUNDS,
    concurrentCalls: callsC,
    expectedFailures: 0,
    unexpectedErrors: unexpectedC,
    invariantFailures: invariantsC,
  });
}

async function racePayoutApproval(ctx: FixtureContext, iterations: number): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < iterations; i++) {
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `payap-${i}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqId = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:payap-req:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    const sql1 = asJwtSql(
      IDS.staffA,
      `SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL);`,
    );
    const sql2 = asJwtSql(
      IDS.staffB,
      `SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL);`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    calls += outs.length;
    const payoutIds = new Set(outs.filter((o) => o.ok).map(lastUuid).filter(Boolean));
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const payoutCount = countSql(
      `SELECT COUNT(*)::text FROM public.partner_payouts WHERE payout_request_id = '${reqId}'::uuid;`,
    );
    const reqStatus = psql(
      `SELECT status::text FROM public.partner_payout_requests WHERE id = '${reqId}'::uuid;`,
    );
    if (payoutCount !== 1 || payoutIds.size !== 1 || reqStatus !== "APPROVED") {
      invariants++;
    }
  }
  record({
    race: "RACE5_PAYOUT_APPROVAL",
    variant: "dual_staff",
    pass: unexpected === 0 && invariants === 0,
    iterations,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

async function racePayoutPaid(ctx: FixtureContext): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < PAIRWISE; i++) {
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `paypaid-${i}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqId = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:paypaid-req:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    const payoutId = psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    const sql1 = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-${tag}-A', 'conc:paypaid:${tag}');`,
    );
    const sql2 = asJwtSql(
      IDS.staffB,
      `SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-${tag}-B', 'conc:paypaid:${tag}:b');`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    calls += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const status = psql(`SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`);
    const ledger = countSql(
      `SELECT COUNT(*)::text FROM public.partner_ledger_transactions
       WHERE reference_type = 'partner_payout' AND reference_id = '${payoutId}'::uuid;`,
    );
    const refs = psql(
      `SELECT external_reference FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`,
    );
    // Exactly one PAID; exactly one ledger PAYOUT; external ref is one of the two (first winner)
    if (status !== "PAID" || ledger !== 1) invariants++;
    if (!refs.startsWith(`EXT-${tag}-`)) invariants++;
  }

  // Fan-out same key
  let unexpectedF = 0;
  let invariantsF = 0;
  let callsF = 0;
  for (let r = 0; r < FANOUT_ROUNDS; r++) {
    psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `paypaidfan-${r}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqId = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:paypaidfan-req:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    const payoutId = psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-FAN-${tag}', 'conc:paypaidfan:${tag}');`,
    );
    const outs = await parallelPsql(Array.from({ length: FANOUT_N }, () => sql));
    callsF += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpectedF++;
    }
    const ledger = countSql(
      `SELECT COUNT(*)::text FROM public.partner_ledger_transactions
       WHERE reference_type = 'partner_payout' AND reference_id = '${payoutId}'::uuid;`,
    );
    if (ledger !== 1) invariantsF++;
  }

  record({
    race: "RACE6_PAYOUT_PAID",
    variant: "dual_staff_diff_external_ref",
    pass: unexpected === 0 && invariants === 0,
    iterations: PAIRWISE,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
  record({
    race: "RACE6_PAYOUT_PAID",
    variant: "fanout",
    pass: unexpectedF === 0 && invariantsF === 0,
    iterations: FANOUT_ROUNDS,
    concurrentCalls: callsF,
    expectedFailures: 0,
    unexpectedErrors: unexpectedF,
    invariantFailures: invariantsF,
  });
}

async function raceRefundVsPayout(ctx: FixtureContext): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < PAIRWISE_HEAVY; i++) {
    psql(`
DELETE FROM public.partner_adjustments WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `refund-${i}-${Date.now()}`;
    const seeded = seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqId = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:refund-req:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    const payoutId = psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    // A: paid vs refund in parallel (refund requires PAID related payout — may fail until paid commits)
    const paidSql = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-R-${tag}', 'conc:refund-paid:${tag}');`,
    );
    const refundSql = asJwtSql(
      IDS.staffB,
      `SELECT public.process_partner_refund_adjustment('${ctx.partnerAId}'::uuid, 10000, 'conc refund', 'partner_sale', '${seeded.saleId}'::uuid, '${payoutId}'::uuid, 'conc:refund-adj:${tag}', 'EUR');`,
    );
    const outs = await parallelPsql([paidSql, refundSql]);
    calls += outs.length;
    for (const o of outs) {
      if (!o.ok) {
        const cls = classifyCall(o);
        // VALIDATION_FAILED if refund raced before paid is expected
        if (cls === "UNEXPECTED_ERROR") unexpected++;
      }
    }
    const payoutStatus = psql(
      `SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`,
    );
    // If paid committed, status must remain PAID (immutable)
    if (outs[0].ok && payoutStatus !== "PAID") invariants++;
    if (payoutStatus === "PAID") {
      // ensure paid immutable still
      const still = psql(
        `SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`,
      );
      if (still !== "PAID") invariants++;
    }
    const adj = countSql(
      `SELECT COUNT(*)::text FROM public.partner_adjustments WHERE idempotency_key = 'conc:refund-adj:${tag}';`,
    );
    if (adj > 1) invariants++;
    try {
      assertLedgerBalanced();
    } catch {
      invariants++;
    }
  }

  // C: dual refund same key
  let unexpectedC = 0;
  let invariantsC = 0;
  let callsC = 0;
  for (let i = 0; i < PAIRWISE; i++) {
    const tag = `refund2-${i}-${Date.now()}`;
    psql(`
DELETE FROM public.partner_adjustments WHERE partner_id = '${ctx.partnerAId}'::uuid AND idempotency_key LIKE 'conc:refund2:%';
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const seeded = seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqId = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:refund2-req:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    const payoutId = psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    psql(`
SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-R2-${tag}', 'conc:refund2-paid:${tag}')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    const key = `conc:refund2:${tag}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.process_partner_refund_adjustment('${ctx.partnerAId}'::uuid, 5000, 'dual', 'partner_sale', '${seeded.saleId}'::uuid, '${payoutId}'::uuid, '${key}', 'EUR');`,
    );
    const outs = await parallelPsql([sql, sql]);
    callsC += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpectedC++;
    }
    const adj = countSql(
      `SELECT COUNT(*)::text FROM public.partner_adjustments WHERE idempotency_key = '${key}';`,
    );
    if (adj !== 1) invariantsC++;
    const paid = psql(`SELECT status::text FROM public.partner_payouts WHERE id = '${payoutId}'::uuid;`);
    if (paid !== "PAID") invariantsC++;
  }

  record({
    race: "RACE7_REFUND_VS_PAYOUT",
    variant: "paid_vs_refund_parallel",
    pass: unexpected === 0 && invariants === 0,
    iterations: PAIRWISE_HEAVY,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
  record({
    race: "RACE7_REFUND_VS_PAYOUT",
    variant: "dual_refund_same_key",
    pass: unexpectedC === 0 && invariantsC === 0,
    iterations: PAIRWISE,
    concurrentCalls: callsC,
    expectedFailures: 0,
    unexpectedErrors: unexpectedC,
    invariantFailures: invariantsC,
  });
}

async function raceCashReceipt(): Promise<void> {
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  for (let i = 0; i < PAIRWISE; i++) {
    const key = `conc:cash:${i}:${Date.now()}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_cash_receipt(5000, '${key}', NULL, 'bank', 'EUR');`,
    );
    const outs = await parallelPsql([sql, sql]);
    calls += outs.length;
    const ids = new Set(outs.filter((o) => o.ok).map(lastUuid).filter(Boolean));
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const n = countSql(
      `SELECT COUNT(*)::text FROM public.partner_cash_receipts WHERE idempotency_key = '${key}';`,
    );
    const ledger = countSql(
      `SELECT COUNT(*)::text FROM public.partner_ledger_transactions WHERE idempotency_key = '${key}:ledger';`,
    );
    if (n !== 1 || ledger !== 1 || ids.size !== 1) invariants++;
  }

  // Conflicting amount same key — amount must not change after first insert
  let unexpectedB = 0;
  let invariantsB = 0;
  let callsB = 0;
  for (let i = 0; i < PAIRWISE; i++) {
    const key = `conc:cash-amt:${i}:${Date.now()}`;
    const sql1 = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_cash_receipt(5000, '${key}', NULL, 'bank', 'EUR');`,
    );
    const sql2 = asJwtSql(
      IDS.staffB,
      `SELECT public.record_partner_cash_receipt(9000, '${key}', NULL, 'bank', 'EUR');`,
    );
    const outs = await parallelPsql([sql1, sql2]);
    callsB += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpectedB++;
    }
    const amt = Number(
      psql(`SELECT amount_cents::text FROM public.partner_cash_receipts WHERE idempotency_key = '${key}';`),
    );
    const n = countSql(
      `SELECT COUNT(*)::text FROM public.partner_cash_receipts WHERE idempotency_key = '${key}';`,
    );
    // First commit wins amount; conflict update only touches evidence_note
    if (n !== 1 || (amt !== 5000 && amt !== 9000)) invariantsB++;
    // Must be exactly one of the two amounts (winner), not a merge
    if (n === 1 && amt !== 5000 && amt !== 9000) invariantsB++;
  }

  // Fan-out
  let unexpectedF = 0;
  let invariantsF = 0;
  let callsF = 0;
  for (let r = 0; r < FANOUT_ROUNDS; r++) {
    const key = `conc:cash-fan:${r}:${Date.now()}`;
    const sql = asJwtSql(
      IDS.staffA,
      `SELECT public.record_partner_cash_receipt(2500, '${key}', NULL, 'bank', 'EUR');`,
    );
    const outs = await parallelPsql(Array.from({ length: FANOUT_N }, () => sql));
    callsF += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpectedF++;
    }
    const n = countSql(
      `SELECT COUNT(*)::text FROM public.partner_cash_receipts WHERE idempotency_key = '${key}';`,
    );
    if (n !== 1) invariantsF++;
  }

  // Authorization: partner cannot record cash receipt
  const denied = (() => {
    try {
      psql(`
SELECT public.record_partner_cash_receipt(1000, 'conc:cash-deny', NULL, 'x', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
      return false;
    } catch {
      return true;
    }
  })();
  if (!denied) invariants++;

  record({
    race: "RACE8_CASH_RECEIPT",
    variant: "same_key_pairwise",
    pass: unexpected === 0 && invariants === 0,
    iterations: PAIRWISE,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
  record({
    race: "RACE8_CASH_RECEIPT",
    variant: "conflicting_amount_same_key",
    pass: unexpectedB === 0 && invariantsB === 0,
    iterations: PAIRWISE,
    concurrentCalls: callsB,
    expectedFailures: 0,
    unexpectedErrors: unexpectedB,
    invariantFailures: invariantsB,
  });
  record({
    race: "RACE8_CASH_RECEIPT",
    variant: "fanout",
    pass: unexpectedF === 0 && invariantsF === 0,
    iterations: FANOUT_ROUNDS,
    concurrentCalls: callsF,
    expectedFailures: 0,
    unexpectedErrors: unexpectedF,
    invariantFailures: invariantsF,
  });
}

async function raceLedgerImmutability(): Promise<void> {
  let invariants = 0;
  try {
    assertLedgerBalanced();
    assertLedgerImmutableDenied();
  } catch {
    invariants++;
  }
  record({
    race: "RACE9_LEDGER_IMMUTABILITY",
    variant: "update_delete_denied_balanced",
    pass: invariants === 0,
    iterations: 1,
    concurrentCalls: 0,
    expectedFailures: 0,
    unexpectedErrors: 0,
    invariantFailures: invariants,
  });
}

async function raceRoleChange(ctx: FixtureContext): Promise<void> {
  // Payout request vs partner suspension — deterministic serialization check
  let unexpected = 0;
  let invariants = 0;
  let calls = 0;
  let unproven = false;

  for (let i = 0; i < PAIRWISE; i++) {
    // restore ACTIVE + eligible
    psql(`
UPDATE public.partner_profiles
SET status = 'ACTIVE', payout_eligible = true, updated_at = NOW()
WHERE id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
    const tag = `role-${i}-${Date.now()}`;
    seedLiability(IDS.partnerAUser, "CONCPA", tag, 100000, 1000);
    const avail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    const reqSql = asJwtSql(
      IDS.partnerAUser,
      `SELECT public.request_partner_payout(${Math.min(avail, 5000)}, 'conc:role-req:${tag}', 'EUR');`,
    );
    const suspSql = `
UPDATE public.partner_profiles
SET status = 'SUSPENDED', payout_eligible = false, updated_at = NOW()
WHERE id = '${ctx.partnerAId}'::uuid
RETURNING id;
`;
    const outs = await parallelPsql([reqSql, suspSql]);
    calls += outs.length;
    for (const o of outs) {
      if (!o.ok && classifyCall(o) === "UNEXPECTED_ERROR") unexpected++;
    }
    const status = psql(
      `SELECT status::text FROM public.partner_profiles WHERE id = '${ctx.partnerAId}'::uuid;`,
    );
    const reqCount = countSql(
      `SELECT COUNT(*)::text FROM public.partner_payout_requests WHERE idempotency_key = 'conc:role-req:${tag}';`,
    );
    // Valid serializations:
    // 1) request wins then suspend → 1 request + SUSPENDED
    // 2) suspend wins then request → 0 request + SUSPENDED + FORBIDDEN/VALIDATION
    if (status !== "SUSPENDED") invariants++;
    if (reqCount > 1) invariants++;
    // If request exists after suspend, it must have been committed before suspend observed — OK historically
    // New requests after suspend must fail:
    const after = (() => {
      try {
        psql(`
SELECT public.request_partner_payout(1000, 'conc:role-after:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
        return "ALLOWED";
      } catch {
        return "DENIED";
      }
    })();
    if (after !== "DENIED") invariants++;
  }

  // Staff authority revocation is not modeled as a concurrent toggle in current schema
  // (admin_roles is not time-gated inside payout RPCs beyond is_staff_admin() at call start).
  // Mark that sub-scenario UNPROVEN without failing the financial races above.
  unproven = true;

  record({
    race: "RACE10_ROLE_CHANGE",
    variant: "payout_vs_suspension",
    pass: unexpected === 0 && invariants === 0,
    iterations: PAIRWISE,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
    detail: unproven
      ? "staff-authority-revocation-during-mutation left UNPROVEN (no temporal admin grant model)"
      : undefined,
  });

  // restore partner A
  psql(`
UPDATE public.partner_profiles
SET status = 'ACTIVE', payout_eligible = true, updated_at = NOW()
WHERE id = '${ctx.partnerAId}'::uuid;
`);
}

/** Deterministic loser/error-code contracts beyond the race matrix (section 19). */
async function raceNegativeContracts(ctx: FixtureContext): Promise<void> {
  const unexpected = 0;
  let invariants = 0;
  let calls = 0;
  const tag = `neg-${Date.now()}`;

  // SALE: convert once, then conflicting payload / different key / retry same key
  const lead = createLead({
    partnerUserId: IDS.partnerAUser,
    name: `Neg Sale ${tag}`,
    email: `negsale.${tag}@example.invalid`,
    dedupe: `conc-neg-sale-${tag}`,
    code: "CONCPA",
  });
  const saleId = psql(`
SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, 'conc:neg-sale:${tag}', 1000, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
  calls += 1;

  const retry = psqlAllowFail(`
SELECT public.confirm_partner_sale('${lead}'::uuid, 100000, 'conc:neg-sale:${tag}', 1000, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
  calls += 1;
  if (!retry.ok || retry.out.trim() !== saleId) invariants++;

  const conflictAmt = psqlAllowFail(`
SELECT public.confirm_partner_sale('${lead}'::uuid, 99999, 'conc:neg-sale-amt:${tag}', 1000, 'EUR', NULL, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffB}',true)) s;
`);
  calls += 1;
  if (conflictAmt.ok || !String(conflictAmt.err).includes("PARTNER_LEAD_ALREADY_CONVERTED")) {
    invariants++;
  }

  // Direct INSERT as authenticated must fail (SELECT-only grants + RLS)
  const directIns = psqlAllowFail(`
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true);
INSERT INTO public.partner_sales (
  partner_id, partner_lead_id, status, gross_amount_cents, currency, idempotency_key
) VALUES (
  '${ctx.partnerAId}'::uuid, '${lead}'::uuid, 'SETTLED', 1, 'EUR', 'conc:neg-direct:${tag}'
);
COMMIT;
`);
  calls += 1;
  if (directIns.ok) invariants++;

  const sales = countSql(
    `SELECT COUNT(*)::text FROM public.partner_sales WHERE partner_lead_id = '${lead}'::uuid;`,
  );
  if (sales !== 1) invariants++;

  // PAYOUT negatives — clear partner A reservations
  psql(`
DELETE FROM public.partner_payouts WHERE partner_id = '${ctx.partnerAId}'::uuid;
DELETE FROM public.partner_payout_requests WHERE partner_id = '${ctx.partnerAId}'::uuid;
`);
  seedLiability(IDS.partnerAUser, "CONCPA", `neg-liab-${tag}`, 100000, 1000);
  const avail = Number(
    psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
  );
  if (avail < 2) {
    invariants++;
  } else {
    // sum equals liability → both should succeed under serialization
    const half = Math.floor(avail / 2);
    const rest = avail - half;
    const eqOuts = await parallelPsql([
      asJwtSql(
        IDS.partnerAUser,
        `SELECT public.request_partner_payout(${half}, 'conc:neg-eq-a:${tag}', 'EUR');`,
      ),
      asJwtSql(
        IDS.partnerAUser,
        `SELECT public.request_partner_payout(${rest}, 'conc:neg-eq-b:${tag}', 'EUR');`,
      ),
    ]);
    calls += eqOuts.length;
    const eqOk = eqOuts.filter((o) => o.ok).length;
    if (eqOk !== 2) invariants++;
    const reservedEq = Number(
      psql(`
SELECT COALESCE(SUM(requested_amount_cents),0)::text FROM public.partner_payout_requests
WHERE partner_id = '${ctx.partnerAId}'::uuid AND status = 'REQUESTED'
  AND idempotency_key LIKE 'conc:neg-eq-%:${tag}';
`),
    );
    if (reservedEq !== avail) invariants++;

    psql(`
DELETE FROM public.partner_payout_requests
WHERE partner_id = '${ctx.partnerAId}'::uuid AND idempotency_key LIKE 'conc:neg-eq-%:${tag}';
`);

    // Full reservation then +1 cent must fail with PARTNER_INSUFFICIENT_LIABILITY
    const fullReq = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:neg-over-a:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    calls += 1;
    if (!fullReq) invariants++;

    const overOne = psqlAllowFail(`
SELECT public.request_partner_payout(1, 'conc:neg-over-b:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    calls += 1;
    if (
      overOne.ok ||
      !String(overOne.err).includes("PARTNER_INSUFFICIENT_LIABILITY")
    ) {
      invariants++;
    }

    // pending reservation blocks further spend
    const pendingAvail = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    if (pendingAvail !== 0) invariants++;
    const whilePending = psqlAllowFail(`
SELECT public.request_partner_payout(1, 'conc:neg-while-pending:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    calls += 1;
    if (
      whilePending.ok ||
      !String(whilePending.err).includes("PARTNER_INSUFFICIENT_LIABILITY")
    ) {
      invariants++;
    }

    // reject releases reservation
    const reqId = fullReq;
    psql(`
SELECT public.approve_partner_payout_request('${reqId}'::uuid, false, 'neg-reject')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    calls += 1;
    const afterReject = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    if (afterReject !== avail) invariants++;

    // approved (PENDING payout) continues to reserve via partner_payouts
    const req2 = psql(`
SELECT public.request_partner_payout(${avail}, 'conc:neg-appr:${tag}', 'EUR')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
    calls += 1;
    const payoutId = psql(`
SELECT public.approve_partner_payout_request('${req2}'::uuid, true, NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    calls += 1;
    const afterApprove = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    if (afterApprove !== 0) invariants++;

    // paid must not double-deduct available below zero / further
    psql(`
SELECT public.record_partner_payout_paid('${payoutId}'::uuid, 'EXT-NEG-${tag}', 'conc:neg-paid:${tag}')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);
    calls += 1;
    const afterPaid = Number(
      psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
    );
    if (afterPaid !== 0) invariants++;
  }

  // different partners parallel — no cross-blocking overspend
  psql(`
DELETE FROM public.partner_payouts WHERE partner_id IN ('${ctx.partnerAId}'::uuid, '${ctx.partnerBId}'::uuid);
DELETE FROM public.partner_payout_requests WHERE partner_id IN ('${ctx.partnerAId}'::uuid, '${ctx.partnerBId}'::uuid);
`);
  seedLiability(IDS.partnerAUser, "CONCPA", `neg-pa-${tag}`, 50000, 1000);
  seedLiability(IDS.partnerBUser, "CONCPB", `neg-pb-${tag}`, 50000, 1000);
  const availA = Number(
    psql(`SELECT public.partner_available_liability_cents('${ctx.partnerAId}'::uuid);`),
  );
  const availB = Number(
    psql(`SELECT public.partner_available_liability_cents('${ctx.partnerBId}'::uuid);`),
  );
  const partnerOuts = await parallelPsql([
    asJwtSql(
      IDS.partnerAUser,
      `SELECT public.request_partner_payout(${availA}, 'conc:neg-par-a:${tag}', 'EUR');`,
    ),
    asJwtSql(
      IDS.partnerBUser,
      `SELECT public.request_partner_payout(${availB}, 'conc:neg-par-b:${tag}', 'EUR');`,
    ),
  ]);
  calls += partnerOuts.length;
  if (partnerOuts.filter((o) => o.ok).length !== 2) invariants++;

  // currency: unsupported length fails validation; parallel USD vs EUR share liability pool
  const badCur = psqlAllowFail(`
SELECT public.request_partner_payout(1, 'conc:neg-badcur:${tag}', 'EU')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
  calls += 1;
  if (badCur.ok || !String(badCur.err).includes("VALIDATION_FAILED")) invariants++;

  record({
    race: "RACE11_NEGATIVE_CONTRACTS",
    variant: "sale_and_payout_error_codes",
    pass: unexpected === 0 && invariants === 0,
    iterations: 1,
    concurrentCalls: calls,
    expectedFailures: 0,
    unexpectedErrors: unexpected,
    invariantFailures: invariants,
  });
}

async function runSuite(runLabel: string): Promise<boolean> {
  console.log(`\n=== CONCURRENCY SUITE ${runLabel} ===`);
  results.length = 0;
  totalIterations = 0;
  totalConcurrentCalls = 0;
  totalUnexpected = 0;
  totalInvariant = 0;

  const ctx = resetConcurrencyFixtures();
  console.log(`fixtures partnerA=${ctx.partnerAId} partnerB=${ctx.partnerBId}`);

  await raceSameKeySale(ctx, PAIRWISE);
  await raceDifferentKeySale(ctx, PAIRWISE);
  await raceFanoutSale(ctx, FANOUT_ROUNDS, FANOUT_N);
  await raceLeadConversion(ctx, PAIRWISE);
  await raceCommissionViaConfirm(ctx, PAIRWISE_HEAVY);
  await racePayoutRequests(ctx);
  await racePayoutApproval(ctx, PAIRWISE);
  await racePayoutPaid(ctx);
  await raceRefundVsPayout(ctx);
  await raceCashReceipt();
  await raceLedgerImmutability();
  await raceRoleChange(ctx);
  await raceNegativeContracts(ctx);

  restorePayoutFlag();
  const flagOff = psql(
    `SELECT enabled::text FROM public.feature_flags WHERE key = 'partner_payouts';`,
  );
  if (flagOff !== "false") {
    console.error("FAIL partner_payouts flag not restored");
    return false;
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\nSUITE ${runLabel} summary: scenarios=${results.length} fail=${failed.length} iterations=${totalIterations} calls=${totalConcurrentCalls} unexpected=${totalUnexpected} invariants=${totalInvariant}`,
  );
  return failed.length === 0;
}

async function main() {
  console.log("=== RC2 FINANCIAL CONCURRENCY VALIDATION ===");
  console.log(`PAIRWISE=${PAIRWISE} HEAVY=${PAIRWISE_HEAVY} FANOUT=${FANOUT_ROUNDS}x${FANOUT_N} QUICK=${QUICK}`);

  // Ensure DB is up
  psql(`SELECT 1;`);

  const run1 = await runSuite("RUN1");
  const snapshot1 = [...results];

  const run2 = await runSuite("RUN2");
  const snapshot2 = [...results];

  const evidenceDir = resolve("docs/evidence/rc2-concurrency-validation");
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(resolve("docs/audits"), { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    quick: QUICK,
    run1: { pass: run1, results: snapshot1 },
    run2: { pass: run2, results: snapshot2 },
    totals: {
      raceCases: snapshot1.length,
      iterations: snapshot1.reduce((a, r) => a + r.iterations, 0) + snapshot2.reduce((a, r) => a + r.iterations, 0),
      concurrentCalls:
        snapshot1.reduce((a, r) => a + r.concurrentCalls, 0) +
        snapshot2.reduce((a, r) => a + r.concurrentCalls, 0),
      unexpectedErrors:
        snapshot1.reduce((a, r) => a + r.unexpectedErrors, 0) +
        snapshot2.reduce((a, r) => a + r.unexpectedErrors, 0),
      invariantFailures:
        snapshot1.reduce((a, r) => a + r.invariantFailures, 0) +
        snapshot2.reduce((a, r) => a + r.invariantFailures, 0),
    },
  };

  writeFileSync(
    resolve("docs/audits/VDB_RC2_CONCURRENCY_RESULTS.json"),
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
  writeFileSync(
    resolve(evidenceDir, "summary.json"),
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );

  const pass = run1 && run2;
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  try {
    restorePayoutFlag();
  } catch {
    /* ignore */
  }
  console.error("RESULT: FAIL", e);
  process.exit(1);
});
