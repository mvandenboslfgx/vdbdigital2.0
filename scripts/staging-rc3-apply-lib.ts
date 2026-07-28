/**
 * Shared helpers for RC3 staging apply. Staging only. Never prints tokens.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";

export const STAGING = "qzekuvmgfekzsowdecyk";
export const PROD = "nhsrdnjfsxfikfbdmdfj";
export const EXPECTED_HEAD =
  "c55abc6c8c6a125f8d475717a8cc973fd22e00ec";
export const EXPECTED_BUNDLE =
  "62bb1c31240f5eb7e16968a6a03d425e52f2c2ef8b09c38c6cbd549ed331973f";
export const EXPECTED_MANIFEST =
  "a82762cbaf851b51c8ee4192b316a821392943b983f8f057a26c7f3ff41ce216";
export const EXPECTED_PRE_TIP = "20260724190000";
export const EXPECTED_PRE_COUNT = 42;
export const EXPECTED_POST_TIP = "20260725120300";
export const EXPECTED_POST_COUNT = 46;

export const FOUR = [
  {
    version: "20260725120000",
    filename: "20260725120000_messaging_support_appointments_rc3.sql",
    name: "messaging_support_appointments_rc3",
    sha256:
      "2a7bda8f49310bf1a24a73d227e984fe12d701f4c6b6394171d10ec91de88fc9",
  },
  {
    version: "20260725120100",
    filename: "20260725120100_messaging_support_appointments_rc3_rpcs.sql",
    name: "messaging_support_appointments_rc3_rpcs",
    sha256:
      "364f4c4e27674e4052aa092b260b05f872cfc962a46bf072326d4aabd10cab65",
  },
  {
    version: "20260725120200",
    filename: "20260725120200_fix_appointment_rls_recursion.sql",
    name: "fix_appointment_rls_recursion",
    sha256:
      "37aa246f07bf4100ece20d12b425c85dd1ddb96cf76d720be2e96a52bd47968b",
  },
  {
    version: "20260725120300",
    filename: "20260725120300_rc3_table_grants.sql",
    name: "rc3_table_grants",
    sha256:
      "786919a0b3267c5eb8ed2ef1073e7c9916063593c168d77ba933891fd727ed00",
  },
] as const;

export const ROOT = process.cwd();
export const EVIDENCE = path.join(ROOT, "docs/evidence/staging-rc3-apply");

export function getCliToken(): string {
  const ps1 = path.join(EVIDENCE, ".vault", "_cred_read.ps1");
  return execFileSync("powershell.exe", ["-NoProfile", "-File", ps1], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

export function api(
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

export async function assertStagingIdentity(token: string) {
  const r = await api(token, "GET", `/v1/projects/${STAGING}`);
  if (r.status !== 200) {
    throw new Error(`identity_http_${r.status}:${r.body.slice(0, 200)}`);
  }
  const j = JSON.parse(r.body) as {
    id: string;
    name: string;
    region: string;
    status: string;
  };
  if (j.id !== STAGING) throw new Error("target_gate_fail");
  // Production denylist invariant (string compare; constants differ by construction)
  if ((j.id as string) === PROD) throw new Error("production_denylist");
  if (j.name !== "VDB Digital Staging") throw new Error("name_mismatch");
  if (j.region !== "eu-west-1") throw new Error("region_mismatch");
  return j;
}

export async function sql(token: string, query: string): Promise<unknown> {
  await assertStagingIdentity(token);
  const r = await api(token, "POST", `/v1/projects/${STAGING}/database/query`, {
    query,
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`SQL_HTTP_${r.status}:${r.body.slice(0, 1200)}`);
  }
  return JSON.parse(r.body);
}

export function sha256File(fp: string) {
  return createHash("sha256").update(fs.readFileSync(fp)).digest("hex");
}

export function sha256Text(s: string) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function writeJson(name: string, data: unknown) {
  ensureDir(EVIDENCE);
  const fp = path.join(EVIDENCE, name);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n");
  return fp;
}

export function verifyLocalFreeze() {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (head !== EXPECTED_HEAD) throw new Error(`head_mismatch:${head}`);
  const tag = execFileSync(
    "git",
    ["rev-parse", "shared-backend-rc3-local-freeze^{}"],
    { encoding: "utf8" },
  ).trim();
  if (tag !== EXPECTED_HEAD) throw new Error(`tag_mismatch:${tag}`);
  const bundle = fs
    .readFileSync(
      path.join(
        ROOT,
        "contracts/releases/vdb-backend-contract-0.2.0-rc.3/BUNDLE_SHA256.txt",
      ),
      "utf8",
    )
    .trim();
  if (bundle !== EXPECTED_BUNDLE) throw new Error(`bundle:${bundle}`);
  const manifestHash = sha256File(
    path.join(
      ROOT,
      "contracts/releases/vdb-backend-contract-0.2.0-rc.3/migration-manifest.json",
    ),
  );
  if (manifestHash !== EXPECTED_MANIFEST) {
    throw new Error(`manifest:${manifestHash}`);
  }
  const files = FOUR.map((f) => {
    const fp = path.join(ROOT, "supabase/migrations", f.filename);
    const disk = sha256File(fp);
    if (disk !== f.sha256) throw new Error(`file_hash:${f.version}:${disk}`);
    return { ...f, disk };
  });
  return { head, tag, bundle, manifestHash, files };
}
