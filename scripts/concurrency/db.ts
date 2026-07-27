/**
 * Parallel DB harness for RC2 concurrency validation.
 * Each concurrent actor uses a separate psql session inside supabase_db_vdbdigital2.
 * No new npm dependencies. No secrets in logs.
 */
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

export const CONTAINER = "supabase_db_vdbdigital2";

export type CallOutcome = {
  index: number;
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  classification?: string;
  errorCode?: string;
};

export function psql(sql: string): string {
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
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 },
  ).trim();
}

export function psqlAllowFail(sql: string): { ok: boolean; out: string; err: string } {
  try {
    const out = psql(sql);
    return { ok: true, out, err: "" };
  } catch (e) {
    const err = e as { stderr?: string; message?: string; stdout?: string };
    return {
      ok: false,
      out: String(err.stdout ?? "").trim(),
      err: String(err.stderr ?? err.message ?? e).trim(),
    };
  }
}

/** Run N SQL statements in parallel, each in its own psql connection (inside one docker bash). */
export async function parallelPsql(sqls: string[]): Promise<CallOutcome[]> {
  const tag = randomBytes(4).toString("hex");
  const parts: string[] = ["set -e", `TAG=${tag}`, "mkdir -p /tmp/conc-$TAG"];

  sqls.forEach((_, i) => {
    parts.push(`: > /tmp/conc-$TAG/sql_${i}.sql`);
  });

  // Write SQL files via base64 to avoid quoting issues
  const b64chunks = sqls.map((sql) => Buffer.from(sql, "utf8").toString("base64"));

  const script = `
set +e
TAG='${tag}'
DIR=/tmp/conc-$TAG
mkdir -p "$DIR"
${b64chunks
  .map(
    (b64, i) =>
      `echo '${b64}' | base64 -d > "$DIR/sql_${i}.sql"`,
  )
  .join("\n")}
# Barrier: all workers wait until READY file appears after forks are launched
READY="$DIR/ready"
rm -f "$READY"
for i in ${sqls.map((_, i) => i).join(" ")}; do
  (
    # wait until gate opens (barrier sync only — not the race itself)
    while [ ! -f "$READY" ]; do
      sleep 0.005
    done
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 -At -F $'\\t' -f "$DIR/sql_$i.sql" >"$DIR/out_$i" 2>"$DIR/err_$i"
    echo $? >"$DIR/ec_$i"
  ) &
done
# release barrier once all background jobs exist
touch "$READY"
wait
for i in ${sqls.map((_, i) => i).join(" ")}; do
  echo "===OUT_$i==="
  cat "$DIR/out_$i" 2>/dev/null || true
  echo "===ERR_$i==="
  cat "$DIR/err_$i" 2>/dev/null || true
  echo "===EC_$i==="
  cat "$DIR/ec_$i" 2>/dev/null || echo 1
done
rm -rf "$DIR"
`;

  const raw = await dockerBashAsync(script);
  return parseParallelOutput(raw, sqls.length);
}

function dockerBashAsync(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      ["exec", "-i", CONTAINER, "bash", "-s"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !stdout.includes("===OUT_0===")) {
        reject(new Error(`docker bash exit ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(stdout);
    });
    child.stdin.write(script);
    child.stdin.end();
  });
}

function parseParallelOutput(raw: string, n: number): CallOutcome[] {
  const out: CallOutcome[] = [];
  for (let i = 0; i < n; i++) {
    const stdout = sliceBlock(raw, `===OUT_${i}===`, `===ERR_${i}===`).trim();
    const stderr = sliceBlock(raw, `===ERR_${i}===`, `===EC_${i}===`).trim();
    const ecRaw = sliceBlock(raw, `===EC_${i}===`, i + 1 < n ? `===OUT_${i + 1}===` : null).trim();
    const exitCode = Number(ecRaw.split(/\s+/)[0] || "1");
    out.push({
      index: i,
      ok: exitCode === 0,
      stdout,
      stderr,
      exitCode,
      errorCode: extractErrorCode(stderr || stdout),
    });
  }
  return out;
}

function sliceBlock(raw: string, start: string, end: string | null): string {
  const a = raw.indexOf(start);
  if (a < 0) return "";
  const from = a + start.length;
  const b = end ? raw.indexOf(end, from) : raw.length;
  return raw.slice(from, b < 0 ? raw.length : b);
}

export function extractErrorCode(text: string): string | undefined {
  const t = text.replace(/\s+/g, " ");
  const known = [
    "FEATURE_NOT_CONFIGURED",
    "VALIDATION_FAILED",
    "FORBIDDEN",
    "AUTH_REQUIRED",
    "NOT_FOUND",
    "partner_payout_paid_immutable",
    "partner_ledger_immutable",
    "partner_ledger_unbalanced",
    "unique_violation",
    "deadlock detected",
    "could not serialize",
  ];
  for (const k of known) {
    if (t.includes(k)) return k;
  }
  const m = t.match(/ERROR:\s*([A-Za-z0-9_:-]+)/);
  return m?.[1];
}

export function classifyCall(
  outcome: CallOutcome,
  opts: {
    expectIdempotentSuccess?: boolean;
    winnerIds?: Set<string>;
  } = {},
): string {
  if (outcome.ok) {
    const id = outcome.stdout.split("\n").filter(Boolean).pop() ?? "";
    if (opts.winnerIds && opts.winnerIds.size > 0 && opts.winnerIds.has(id)) {
      return opts.expectIdempotentSuccess ? "IDEMPOTENT_SUCCESS" : "SUCCESS_WINNER";
    }
    if (opts.winnerIds && opts.winnerIds.size > 0 && !opts.winnerIds.has(id)) {
      // multiple distinct successes may still be classified by caller
      return "SUCCESS_WINNER";
    }
    return "SUCCESS_WINNER";
  }
  const code = outcome.errorCode ?? "";
  if (code === "VALIDATION_FAILED") return "EXPECTED_INSUFFICIENT_LIABILITY";
  if (code === "FORBIDDEN" || code === "AUTH_REQUIRED") return "EXPECTED_AUTHORIZATION_DENIAL";
  if (code === "unique_violation" || /duplicate key|unique constraint/i.test(outcome.stderr)) {
    return "EXPECTED_CONFLICT";
  }
  if (code === "deadlock detected" || outcome.stderr.includes("40P01")) {
    return "RETRYABLE_DEADLOCK";
  }
  if (code === "could not serialize" || outcome.stderr.includes("40001")) {
    return "RETRYABLE_SERIALIZATION_FAILURE";
  }
  if (/already|conflict|NOT_FOUND/i.test(outcome.stderr)) {
    return "EXPECTED_ALREADY_PROCESSED";
  }
  return "UNEXPECTED_ERROR";
}

export function asJwtSql(userId: string, selectRpcSql: string): string {
  // set_config(..., true) is transaction-local; psql auto-commits each statement.
  // Bind JWT in the same statement as the RPC (same pattern as verify-partner-backend).
  const rpc = selectRpcSql.trim().replace(/;$/, "");
  return `${rpc}\nFROM (SELECT set_config('request.jwt.claim.sub', '${userId}', true)) s;`;
}
