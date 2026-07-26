/**
 * PERF-GATE-001 — deterministic performance budget validator (pure logic).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

export type GateProfile = "mobile" | "desktop";

export type GateRoute = { id: string; path: string };

export type PerfGateBudgetsFile = {
  id: string;
  effectiveDate: string;
  routes: GateRoute[];
  profiles: GateProfile[];
  runsPerRouteProfile: number;
  expectedAudits: number;
  budgets: {
    accessibilityExact: number;
    bestPracticesExact: number;
    seoExact: number;
    desktopPerformanceMin: number;
    mobilePerformanceMin: number;
    observedLcpMaxMs: number;
    mobileSimLcpMedianMaxMs: number;
    mobileSimLcpRunMaxMs: number;
    desktopSimLcpMaxMs: number;
    clsMedianMax: number;
    clsRunMax: number;
    tbtMedianMaxMs: number;
    tbtRunMaxMs: number;
    ttfbMedianMaxMs: number;
    ttfbRunMaxMs: number;
    scriptTransferRunMaxBytes: number;
    jsRegressionPctMax: number;
    jsRegressionAbsMaxBytes: number;
    nonNextScriptTransferMaxBytes: number;
    mobileScriptEvaluationMedianMaxMs: number;
    mobileScriptEvaluationRunMaxMs: number;
    consoleErrorsExact: number;
  };
  baselinePath: string;
};

export type RunMetrics = {
  routeId: string;
  routePath: string;
  profile: GateProfile;
  run: number;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  simLCP: number | null;
  obsLCP: number | null;
  CLS: number | null;
  TBT: number | null;
  TTFB: number | null;
  scriptTransfer: number | null;
  nonNextScriptTransfer: number | null;
  scriptEvaluation: number | null;
  consoleErrorCount: number | null;
  jsonPath: string;
};

export type BudgetCheck = {
  id: string;
  pass: boolean;
  measured: number | string | null;
  allowed: number | string;
  detail: string;
  routeId?: string;
  profile?: string;
  run?: number;
};

export type GateResult = {
  pass: boolean;
  gateId: string;
  matrixDir: string;
  expectedAudits: number;
  foundAudits: number;
  checks: BudgetCheck[];
  runs: RunMetrics[];
  medians: Record<string, Record<string, number | null>>;
};

export function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

export function median(values: number[]): number | null {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  // Even length: average of two middle — for n=3 we never hit this; keep deterministic.
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function loadBudgets(cwd = process.cwd()): PerfGateBudgetsFile {
  const path = resolve(cwd, "config/performance/perf-gate-001.budgets.json");
  return JSON.parse(readFileSync(path, "utf8")) as PerfGateBudgetsFile;
}

export function loadBaseline(
  cwd = process.cwd(),
  budgets?: PerfGateBudgetsFile,
): {
  routes: Record<string, { scriptTransferMedian: number }>;
} {
  const cfg = budgets ?? loadBudgets(cwd);
  const path = resolve(cwd, cfg.baselinePath);
  return JSON.parse(readFileSync(path, "utf8")) as {
    routes: Record<string, { scriptTransferMedian: number }>;
  };
}

function resolveReportPath(matrixDir: string, routeId: string, profile: string, run: number): string | null {
  const base = `${routeId}__${profile}__run${run}`;
  const candidates = [
    join(matrixDir, `${base}.report.json`),
    join(matrixDir, `${base}.json`),
    join(matrixDir, base),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function extractRunMetricsFromReport(
  report: Record<string, unknown>,
  meta: { routeId: string; routePath: string; profile: GateProfile; run: number; jsonPath: string },
): RunMetrics {
  const categories = (report.categories ?? {}) as Record<string, { score?: number | null }>;
  const audits = (report.audits ?? {}) as Record<
    string,
    {
      score?: number | null;
      numericValue?: number | null;
      details?: { items?: Array<Record<string, unknown>> };
    }
  >;
  const metricsItem =
    (audits.metrics?.details?.items?.[0] as Record<string, number> | undefined) ?? {};

  const net = (audits["network-requests"]?.details?.items ?? []) as Array<{
    url?: string;
    resourceType?: string;
    transferSize?: number;
  }>;
  const scripts = net.filter((i) => i.resourceType === "Script");
  const scriptTransfer = scripts.reduce((s, i) => s + (i.transferSize || 0), 0);
  const nonNext = scripts
    .filter((i) => !String(i.url || "").includes("/_next/"))
    .reduce((s, i) => s + (i.transferSize || 0), 0);

  const main = (audits["mainthread-work-breakdown"]?.details?.items ?? []) as Array<{
    group?: string;
    duration?: number;
  }>;
  const scriptEval = main.find((i) => i.group === "scriptEvaluation");

  const consoleAudit = audits["errors-in-console"];
  let consoleErrorCount: number | null = null;
  if (consoleAudit) {
    if (Array.isArray(consoleAudit.details?.items)) {
      consoleErrorCount = consoleAudit.details.items.length;
    } else if (consoleAudit.score === 1) {
      consoleErrorCount = 0;
    } else if (consoleAudit.score === 0) {
      consoleErrorCount = null; // unknown count but failed — treat missing precise count as failure upstream
    }
  }

  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  return {
    ...meta,
    performance: num(categories.performance?.score),
    accessibility: num(categories.accessibility?.score),
    bestPractices: num(categories["best-practices"]?.score),
    seo: num(categories.seo?.score),
    simLCP: num(audits["largest-contentful-paint"]?.numericValue ?? metricsItem.largestContentfulPaint),
    obsLCP: num(metricsItem.observedLargestContentfulPaint),
    CLS: num(
      audits["cumulative-layout-shift"]?.numericValue ?? metricsItem.cumulativeLayoutShift,
    ),
    TBT: num(audits["total-blocking-time"]?.numericValue ?? metricsItem.totalBlockingTime),
    TTFB: num(audits["server-response-time"]?.numericValue),
    scriptTransfer,
    nonNextScriptTransfer: nonNext,
    scriptEvaluation: num(scriptEval?.duration),
    consoleErrorCount,
  };
}

function failMissing(
  id: string,
  detail: string,
  meta?: { routeId?: string; profile?: string; run?: number },
): BudgetCheck {
  return {
    id,
    pass: false,
    measured: null,
    allowed: "finite number required",
    detail,
    ...meta,
  };
}

function checkExact(
  id: string,
  measured: number | null,
  allowed: number,
  detail: string,
  meta?: { routeId?: string; profile?: string; run?: number },
): BudgetCheck {
  if (measured === null || Number.isNaN(measured)) {
    return failMissing(id, detail + " (missing/NaN)", meta);
  }
  return {
    id,
    pass: measured === allowed,
    measured,
    allowed,
    detail,
    ...meta,
  };
}

function checkMax(
  id: string,
  measured: number | null,
  allowed: number,
  detail: string,
  meta?: { routeId?: string; profile?: string; run?: number },
): BudgetCheck {
  if (measured === null || Number.isNaN(measured)) {
    return failMissing(id, detail + " (missing/NaN)", meta);
  }
  return {
    id,
    pass: measured <= allowed,
    measured,
    allowed,
    detail,
    ...meta,
  };
}

function checkMin(
  id: string,
  measured: number | null,
  allowed: number,
  detail: string,
  meta?: { routeId?: string; profile?: string; run?: number },
): BudgetCheck {
  if (measured === null || Number.isNaN(measured)) {
    return failMissing(id, detail + " (missing/NaN)", meta);
  }
  return {
    id,
    pass: measured >= allowed,
    measured,
    allowed,
    detail,
    ...meta,
  };
}

export function collectMatrixRuns(
  matrixDir: string,
  budgets: PerfGateBudgetsFile,
): { runs: RunMetrics[]; missing: string[] } {
  const dir = isAbsolute(matrixDir) ? matrixDir : resolve(matrixDir);
  const runs: RunMetrics[] = [];
  const missing: string[] = [];

  for (const route of budgets.routes) {
    for (const profile of budgets.profiles) {
      for (let run = 1; run <= budgets.runsPerRouteProfile; run++) {
        const jsonPath = resolveReportPath(dir, route.id, profile, run);
        if (!jsonPath) {
          missing.push(`${route.id}__${profile}__run${run}`);
          continue;
        }
        let report: Record<string, unknown>;
        try {
          report = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
        } catch {
          missing.push(`${route.id}__${profile}__run${run}:unreadable`);
          continue;
        }
        runs.push(
          extractRunMetricsFromReport(report, {
            routeId: route.id,
            routePath: route.path,
            profile,
            run,
            jsonPath,
          }),
        );
      }
    }
  }

  return { runs, missing };
}

export function evaluatePerfGate001(options: {
  matrixDir: string;
  cwd?: string;
  budgets?: PerfGateBudgetsFile;
  baseline?: { routes: Record<string, { scriptTransferMedian: number }> };
}): GateResult {
  const cwd = options.cwd ?? process.cwd();
  const budgets = options.budgets ?? loadBudgets(cwd);
  const baseline = options.baseline ?? loadBaseline(cwd, budgets);
  const { runs, missing } = collectMatrixRuns(options.matrixDir, budgets);
  const checks: BudgetCheck[] = [];

  checks.push({
    id: "audits_complete",
    pass: missing.length === 0 && runs.length === budgets.expectedAudits,
    measured: runs.length,
    allowed: budgets.expectedAudits,
    detail:
      missing.length === 0
        ? `Found ${runs.length}/${budgets.expectedAudits} audits`
        : `Missing: ${missing.join(", ")}`,
  });

  const medians: Record<string, Record<string, number | null>> = {};

  for (const run of runs) {
    const meta = { routeId: run.routeId, profile: run.profile, run: run.run };
    const b = budgets.budgets;

    checks.push(
      checkExact(
        "accessibility_exact",
        run.accessibility,
        b.accessibilityExact,
        "Accessibility must be exact 1.00",
        meta,
      ),
    );
    checks.push(
      checkExact(
        "best_practices_exact",
        run.bestPractices,
        b.bestPracticesExact,
        "Best Practices must be exact 1.00",
        meta,
      ),
    );
    checks.push(
      checkExact("seo_exact", run.seo, b.seoExact, "SEO must be exact 1.00", meta),
    );

    if (run.profile === "desktop") {
      checks.push(
        checkMin(
          "desktop_performance_min",
          run.performance,
          b.desktopPerformanceMin,
          "Desktop Performance min",
          meta,
        ),
      );
      checks.push(
        checkMax(
          "desktop_sim_lcp_max",
          run.simLCP,
          b.desktopSimLcpMaxMs,
          "Desktop simulated LCP max",
          meta,
        ),
      );
    } else {
      checks.push(
        checkMin(
          "mobile_performance_min",
          run.performance,
          b.mobilePerformanceMin,
          "Mobile Performance min",
          meta,
        ),
      );
      checks.push(
        checkMax(
          "mobile_sim_lcp_run_max",
          run.simLCP,
          b.mobileSimLcpRunMaxMs,
          "Mobile simulated LCP per-run max",
          meta,
        ),
      );
      checks.push(
        checkMax(
          "mobile_script_evaluation_run_max",
          run.scriptEvaluation,
          b.mobileScriptEvaluationRunMaxMs,
          "Mobile script evaluation per-run max",
          meta,
        ),
      );
    }

    checks.push(
      checkMax("observed_lcp_max", run.obsLCP, b.observedLcpMaxMs, "Observed LCP max", meta),
    );
    checks.push(checkMax("cls_run_max", run.CLS, b.clsRunMax, "CLS per-run max", meta));
    checks.push(checkMax("tbt_run_max", run.TBT, b.tbtRunMaxMs, "TBT per-run max", meta));
    checks.push(checkMax("ttfb_run_max", run.TTFB, b.ttfbRunMaxMs, "TTFB per-run max", meta));
    checks.push(
      checkMax(
        "script_transfer_run_max",
        run.scriptTransfer,
        b.scriptTransferRunMaxBytes,
        "Total script transfer per-run max",
        meta,
      ),
    );
    checks.push(
      checkMax(
        "non_next_script_transfer_max",
        run.nonNextScriptTransfer,
        b.nonNextScriptTransferMaxBytes,
        "Non-Next script transfer max",
        meta,
      ),
    );
    checks.push(
      checkExact(
        "console_errors_exact",
        run.consoleErrorCount,
        b.consoleErrorsExact,
        "Console/runtime errors must be 0",
        meta,
      ),
    );
  }

  // Medians + JS regression per route/profile
  for (const route of budgets.routes) {
    for (const profile of budgets.profiles) {
      const group = runs.filter((r) => r.routeId === route.id && r.profile === profile);
      const key = `${route.id}__${profile}`;
      const sim = median(group.map((r) => r.simLCP!).filter((v) => v != null) as number[]);
      const cls = median(group.map((r) => r.CLS!).filter((v) => v != null) as number[]);
      const tbt = median(group.map((r) => r.TBT!).filter((v) => v != null) as number[]);
      const ttfb = median(group.map((r) => r.TTFB!).filter((v) => v != null) as number[]);
      const script = median(
        group.map((r) => r.scriptTransfer!).filter((v) => v != null) as number[],
      );
      const scriptEval = median(
        group.map((r) => r.scriptEvaluation!).filter((v) => v != null) as number[],
      );

      medians[key] = {
        simLCP: sim,
        CLS: cls,
        TBT: tbt,
        TTFB: ttfb,
        scriptTransfer: script,
        scriptEvaluation: scriptEval,
      };

      const meta = { routeId: route.id, profile };

      if (profile === "mobile") {
        checks.push(
          checkMax(
            "mobile_sim_lcp_median_max",
            sim,
            budgets.budgets.mobileSimLcpMedianMaxMs,
            "Mobile simulated LCP median max",
            meta,
          ),
        );
        checks.push(
          checkMax(
            "mobile_script_evaluation_median_max",
            scriptEval,
            budgets.budgets.mobileScriptEvaluationMedianMaxMs,
            "Mobile script evaluation median max",
            meta,
          ),
        );
      }

      checks.push(
        checkMax("cls_median_max", cls, budgets.budgets.clsMedianMax, "CLS median max", meta),
      );
      checks.push(
        checkMax("tbt_median_max", tbt, budgets.budgets.tbtMedianMaxMs, "TBT median max", meta),
      );
      checks.push(
        checkMax(
          "ttfb_median_max",
          ttfb,
          budgets.budgets.ttfbMedianMaxMs,
          "TTFB median max",
          meta,
        ),
      );

      const base = baseline.routes[key]?.scriptTransferMedian;
      if (base == null || !Number.isFinite(base)) {
        checks.push({
          id: "js_regression_baseline",
          pass: false,
          measured: null,
          allowed: "baseline median required",
          detail: `Missing baseline for ${key}`,
          ...meta,
        });
      } else {
        const allowedDelta = Math.min(
          budgets.budgets.jsRegressionAbsMaxBytes,
          base * budgets.budgets.jsRegressionPctMax,
        );
        const allowedMax = base + allowedDelta;
        checks.push(
          checkMax(
            "js_regression_median",
            script,
            allowedMax,
            `JS median ≤ baseline ${base} + min(5%, 8000B)=${allowedDelta}`,
            meta,
          ),
        );
      }
    }
  }

  const pass = checks.every((c) => c.pass);
  return {
    pass,
    gateId: budgets.id,
    matrixDir: options.matrixDir,
    expectedAudits: budgets.expectedAudits,
    foundAudits: runs.length,
    checks,
    runs,
    medians,
  };
}
