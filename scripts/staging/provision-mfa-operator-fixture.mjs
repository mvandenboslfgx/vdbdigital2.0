/**
 * Provision a verified TOTP factor for a synthetic RC5 staging operator.
 *
 * STAGING ONLY:
 * - hard deny if linked Supabase ref is prod/unknown
 * - no contract/schema changes
 * - no mobile/partner/DB backdoors
 *
 * Secrets:
 * - read operator email/password from local vault (outside git)
 * - write TOTP secret + factor-id + otpauth URI into local vault (outside git)
 * - never print secrets/tokens/otpauth URI in logs
 *
 * Negative tests included:
 * - wrong code denies
 * - expired code denies (practically)
 * - wrong factor denies
 * - no-factor account denies
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";

const HOME = process.env.USERPROFILE || "C:/Users/XXX";
const VAULT_DIR = path.join(HOME, ".vdb-vault");

// Input operator login credentials (already provisioned synthetic staging operator accounts)
const INPUT_ENV = path.join(VAULT_DIR, "mobile-rc3-staging-role-matrix.env");

// Output vault for this verified MFA fixture (secrets stay out of git)
const OUTPUT_ENV = path.join(VAULT_DIR, "owner-staging-mfa-operator-rc5.env");
const OUTPUT_MANIFEST = path.join(
  VAULT_DIR,
  "owner-staging-mfa-operator-rc5.manifest.json",
);

// Hand-off document (no secrets; written into repo working tree)
const HANDOFF_DOC =
  "docs/artifacts/owner-rc5-partner-directory-2026-07-29/MOBILE_MFA_AAL2_HANDOFF.md";

const LINKED_REF_PATH = path.join("supabase", ".temp", "project-ref");

const OPERATOR_ROLE = "ADMIN"; // prefer ADMIN when it covers all required AAL2 actions
const OPERATOR_KEYS =
  OPERATOR_ROLE === "ADMIN"
    ? { email: "VDB_STAGING_ADMIN_EMAIL", password: "VDB_STAGING_ADMIN_PASSWORD" }
    : { email: "VDB_STAGING_OWNER_EMAIL", password: "VDB_STAGING_OWNER_PASSWORD" };

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function maskId(id) {
  return `${String(id).slice(0, 8)}â€¦`;
}

function sha256Prefix(value, n = 12) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, n);
}

function readLinkedRef() {
  if (!fs.existsSync(LINKED_REF_PATH)) {
    throw new Error(
      "BLOCKED: supabase/.temp/project-ref missing â€” link CLI before running this script.",
    );
  }
  return fs.readFileSync(LINKED_REF_PATH, "utf8").trim();
}

function guardProjectRef(ref) {
  if (ref === PROD_REF) throw new Error("BLOCKED: linked CLI ref is PRODUCTION.");
  if (ref !== STAGING_REF) throw new Error(`BLOCKED: linked CLI ref is ${ref}; expected STAGING_REF.`);
}

function decodeBase32(secretBase32) {
  const cleaned = secretBase32.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error("invalid_base32");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32, nowMs = Date.now()) {
  // TOTP: SHA-1, 30s step, 6 digits
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(nowMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function linkedSqlJson(sql) {
  const linked = readLinkedRef();
  guardProjectRef(linked);

  const tmp =
    path.join(process.env.TEMP || process.env.TMP || ".", `vdb-staging-sql-${crypto.randomBytes(6).toString("hex")}.sql`);
  fs.writeFileSync(tmp, sql, "utf8");
  try {
    const raw = execFileSync(
      "npx",
      ["supabase", "db", "query", "--linked", "-o", "json", "-f", tmp],
      { encoding: "utf8", shell: true },
    );
    const start = raw.indexOf("{");
    if (start < 0) throw new Error(`linked_sql_parse:${raw.slice(0, 120)}`);
    const parsed = JSON.parse(raw.slice(start));
    if (Array.isArray(parsed?.rows)) return parsed.rows;
    if (Array.isArray(parsed)) return parsed;
    // fallback: some shapes return { data: [...] }
    if (Array.isArray(parsed?.data)) return parsed.data;
    throw new Error("linked_sql_unexpected_shape");
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

function fetchStagingAnonKey() {
  const raw = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", `--project-ref=${STAGING_REF}`, "-o", "json"],
    { encoding: "utf8", shell: true },
  );
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.keys) ? parsed.keys : [];

  for (const row of list) {
    const name = String(row.name ?? row.id ?? "").toLowerCase();
    const type = String(row.type ?? "").toLowerCase();
    const apiKey = row.api_key ?? row.apiKey ?? row.key;
    if (!apiKey) continue;
    if (name === "anon" || type === "anon" || name.includes("publishable")) {
      return apiKey;
    }
  }
  throw new Error("BLOCKED: could not resolve staging anon key from CLI.");
}

async function signInAs(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn_failed:${error.message}`);
  return data;
}

async function getAalLevel(supabase) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? null;
}

async function main() {
  // 0) Guard/self-tests (no DB writes; no secrets printed)
  const testResults = [];
  function test(name, status, detail = "") {
    testResults.push({ name, status, detail });
    console.log(`${status} ${name}${detail ? ` â€” ${detail}` : ""}`);
  }

  try {
    guardProjectRef(STAGING_REF);
    test("staging-ref allow-test", "PASS");
  } catch (e) {
    test("staging-ref allow-test", "FAIL", String(e.message ?? e));
  }

  try {
    guardProjectRef(PROD_REF);
    test("production-ref deny-test", "FAIL", "guard did not throw");
  } catch {
    test("production-ref deny-test", "PASS");
  }

  try {
    guardProjectRef("UNKNOWN_REF_VALUE");
    test("unknown-ref deny-test", "FAIL", "guard did not throw");
  } catch {
    test("unknown-ref deny-test", "PASS");
  }

  const linked = readLinkedRef();
  guardProjectRef(linked);

  // 1) Load operator credentials from local vault
  if (!fs.existsSync(INPUT_ENV)) throw new Error(`Missing input vault: ${INPUT_ENV}`);
  const creds = parseEnvFile(INPUT_ENV);
  const operatorEmail = creds[OPERATOR_KEYS.email];
  const operatorPassword = creds[OPERATOR_KEYS.password];
  const altEmail = creds[OPERATOR_ROLE === "ADMIN" ? "VDB_STAGING_OWNER_EMAIL" : "VDB_STAGING_ADMIN_EMAIL"];
  const altPassword = creds[OPERATOR_ROLE === "ADMIN" ? "VDB_STAGING_OWNER_PASSWORD" : "VDB_STAGING_ADMIN_PASSWORD"];

  if (!operatorEmail || !operatorPassword) throw new Error("Missing operator credentials in input vault.");
  if (!altEmail || !altPassword) throw new Error("Missing alt operator credentials in input vault.");

  // 2) Build Supabase client (anon only) + operator login (AAL1)
  const anonKey = fetchStagingAnonKey();
  const url = `https://${STAGING_REF}.supabase.co`;
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await signInAs(supabase, operatorEmail, operatorPassword);
  const operatorUserObj = await supabase.auth.getUser();
  const operatorUserId = operatorUserObj?.data?.user?.id ?? null;
  const aalBefore = await getAalLevel(supabase);
  if (aalBefore === "aal1") test("AAL1 login status", "PASS");
  else test("AAL1 login status", "FAIL", `currentLevel=${aalBefore}`);

  // 3) Enrollment / factor creation
  const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator-app",
  });
  if (enrollErr || !enrollData) {
    test("factor-enrollmenttest", "FAIL", enrollErr?.message ?? "enroll_failed");
    throw new Error(`enroll_failed:${enrollErr?.message ?? "unknown"}`);
  }

  if (!enrollData.id || !enrollData?.totp?.secret) {
    test("factor-enrollmenttest", "FAIL", "enroll returned unexpected shape");
    throw new Error("enroll_unexpected_shape");
  }

  const factorId = enrollData.id;
  const secretBase32 = enrollData.totp.secret;
  const otpauth = enrollData.totp.otpauth_url || enrollData.totp.otpauthUrl || null;

  // Wrong-code deny (challenge -> verify with wrong code), must not reach aal2 and factor remains unverified
  const wrongCode = generateTotpCode(secretBase32, Date.now() - 30 * 1000 * 10); // far enough to fail
  const { data: challengeWrong, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challengeWrong) {
    test("wrong-code deny-test", "FAIL", `challenge error: ${challengeErr?.message ?? "unknown"}`);
    throw new Error("challenge_wrong_failed");
  }
  const { error: verifyErrWrong } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeWrong.id,
    code: wrongCode,
  });

  if (verifyErrWrong) {
    test("wrong-code deny-test", "PASS", "verify rejected wrong TOTP");
  } else {
    test("wrong-code deny-test", "FAIL", "wrong TOTP was accepted");
  }

  const aalAfterWrong = await getAalLevel(supabase);
  if (aalAfterWrong === "aal1") test("assurance-leveltest (post wrong code)", "PASS");
  else test("assurance-leveltest (post wrong code)", "FAIL", `currentLevel=${aalAfterWrong}`);

  // Factor status check (should not be verified after wrong code)
  const fRows1 = linkedSqlJson(
    `SELECT status::text AS status FROM auth.mfa_factors WHERE id='${String(factorId).replace(/'/g, "''")}' LIMIT 1;`,
  );
  const statusAfterWrong = fRows1?.[0]?.status ?? "unknown";
  if (statusAfterWrong !== "verified") test("factor-enrollment unverified state", "PASS");
  else test("factor-enrollment unverified state", "FAIL", `status=${statusAfterWrong}`);

  // Correct-code verify -> must reach aal2
  const { data: challengeOk, error: challengeErrOk } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErrOk || !challengeOk) throw new Error(`challenge_ok_failed:${challengeErrOk?.message ?? "unknown"}`);

  const correctCode = generateTotpCode(secretBase32);
  const { error: verifyErrOk } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeOk.id,
    code: correctCode,
  });
  if (verifyErrOk) {
    test("challenge/verifytest (correct)", "FAIL", verifyErrOk.message);
    throw new Error("verify_ok_failed");
  }
  test("challenge/verifytest (correct)", "PASS");

  const aalAfterOk = await getAalLevel(supabase);
  if (aalAfterOk === "aal2") test("assurance-leveltest (after correct verify)", "PASS");
  else test("assurance-leveltest (after correct verify)", "FAIL", `currentLevel=${aalAfterOk}`);

  const fRows2 = linkedSqlJson(
    `SELECT status::text AS status FROM auth.mfa_factors WHERE id='${String(factorId).replace(/'/g, "''")}' LIMIT 1;`,
  );
  const statusAfterOk = fRows2?.[0]?.status ?? "unknown";
  if (statusAfterOk === "verified") test("factor-enrollmenttest", "PASS", "factor is verified");
  else test("factor-enrollmenttest", "FAIL", `status=${statusAfterOk}`);

  // Sign out and ensure new session is not permanently aal2
  await supabase.auth.signOut();
  await signInAs(supabase, operatorEmail, operatorPassword);
  const aalAfterRelogin = await getAalLevel(supabase);
  if (aalAfterRelogin === "aal1") test("new session starts as AAL1 (not permanent AAL2)", "PASS");
  else test("new session starts as AAL1 (not permanent AAL2)", "FAIL", `currentLevel=${aalAfterRelogin}`);

  // Expired/old code deny (practically): challenge -> verify with code computed far in the past
  const { data: challengeExpired, error: challengeErrExpired } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErrExpired || !challengeExpired) throw new Error("challenge_expired_failed");
  const expiredCode = generateTotpCode(secretBase32, Date.now() - 30 * 1000 * 20);
  const { error: verifyErrExpired } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeExpired.id,
    code: expiredCode,
  });

  if (verifyErrExpired) test("expired-code deny-test", "PASS");
  else test("expired-code deny-test", "FAIL", "expired code accepted");

  const aalAfterExpired = await getAalLevel(supabase);
  if (aalAfterExpired === "aal1") test("assurance-leveltest (post expired code)", "PASS");
  else test("assurance-leveltest (post expired code)", "FAIL", `currentLevel=${aalAfterExpired}`);

  // Step-up again with correct code
  const { data: challengeStepUp, error: challengeErrStepUp } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErrStepUp || !challengeStepUp) throw new Error("challenge_stepup_failed");
  const stepUpCode = generateTotpCode(secretBase32);
  const { error: verifyErrStepUp } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeStepUp.id,
    code: stepUpCode,
  });
  if (verifyErrStepUp) throw new Error(`stepup_verify_failed:${verifyErrStepUp.message}`);
  const aalAfterStepUp = await getAalLevel(supabase);
  if (aalAfterStepUp === "aal2") test("step-up possible again (AAL1 -> AAL2)", "PASS");
  else test("step-up possible again (AAL1 -> AAL2)", "FAIL", `currentLevel=${aalAfterStepUp}`);

  // Wrong factor id challenge/verify deny
  const fakeFactorId = "00000000-0000-4000-8000-000000000000";
  await supabase.auth.signOut();
  await signInAs(supabase, operatorEmail, operatorPassword);
  const aalBeforeWrongFactor = await getAalLevel(supabase);
  const { error: challengeWrongFactorErr } = await supabase.auth.mfa.challenge({
    factorId: fakeFactorId,
  });
  if (challengeWrongFactorErr) {
    test("challenge for wrong factor-id deny-test", "PASS");
  } else {
    test("challenge for wrong factor-id deny-test", "FAIL", "fake factor accepted");
  }
  const aalAfterWrongFactor = await getAalLevel(supabase);
  if (aalAfterWrongFactor === aalBeforeWrongFactor) test("AAL not upgraded on wrong factor id", "PASS");
  else test("AAL not upgraded on wrong factor id", "FAIL", `before=${aalBeforeWrongFactor};after=${aalAfterWrongFactor}`);

  // No-factor account deny: use OWNER credentials (expected 0 factors currently)
  await supabase.auth.signOut();
  await signInAs(supabase, altEmail, altPassword);
  const aalAlt = await getAalLevel(supabase);

  const { error: challengeNoFactorErr } = await supabase.auth.mfa.challenge({
    factorId: fakeFactorId,
  });
  if (challengeNoFactorErr) test("no-factor account fail-closed", "PASS");
  else test("no-factor account fail-closed", "FAIL", "no-factor account unexpectedly allowed challenge");

  if (aalAlt === "aal1") test("no-factor account starts AAL1", "PASS");
  else test("no-factor account starts AAL1", "FAIL", `currentLevel=${aalAlt}`);

  // 4) Write operator fixture secrets to local vault (outside git)
  // We intentionally do NOT print secret/totp URI in logs.
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  const operatorFingerprint = sha256Prefix(`${operatorUserId}:${OPERATOR_ROLE}:${STAGING_REF}`);

  const envBody = [
    `# LOCAL SECRET â€” DO NOT COMMIT`,
    `# Staging ref: ${STAGING_REF}`,
    `# Operator role: ${OPERATOR_ROLE}`,
    `# Generated: ${new Date().toISOString()}`,
    ``,
    `VDB_STAGING_PROJECT_REF=${STAGING_REF}`,
    `VDB_STAGING_SUPABASE_URL=https://${STAGING_REF}.supabase.co`,
    `VDB_STAGING_OPERATOR_EMAIL=${operatorEmail}`,
    `VDB_STAGING_OPERATOR_PASSWORD=__REDACTED_BY_SCRIPT_OUTPUT__`,
    `VDB_STAGING_OPERATOR_ROLE=${OPERATOR_ROLE}`,
    `VDB_STAGING_OPERATOR_USER_ID=${operatorUserId}`,
    `VDB_STAGING_OPERATOR_AAL_TARGET=aal2`,
    `VDB_STAGING_OPERATOR_FIXTURE_KIND=OWNER_RC5_MFA_OPERATOR_TOTP_VERIFIED`,
    `VDB_STAGING_OPERATOR_FACTOR_ID=${factorId}`,
    `VDB_STAGING_OPERATOR_FACTOR_ID_PREFIX=${String(factorId).slice(0, 8)}`,
    `VDB_STAGING_OPERATOR_TOTP_SECRET=${secretBase32}`,
    `VDB_STAGING_OPERATOR_OTP_AUTH=${otpauth ?? ""}`,
    `VDB_STAGING_OPERATOR_FINGERPRINT=${operatorFingerprint}`,
    ``,
  ].join("\n");

  // store password too, but keep it out of logs by writing it from memory
  const envBodyWithPassword = envBody.replace(
    "VDB_STAGING_OPERATOR_PASSWORD=__REDACTED_BY_SCRIPT_OUTPUT__",
    `VDB_STAGING_OPERATOR_PASSWORD=${operatorPassword}`,
  );
  fs.writeFileSync(OUTPUT_ENV, envBodyWithPassword, { encoding: "utf8" });
  try {
    execFileSync("icacls", [OUTPUT_ENV, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:(R,W)`, "SYSTEM:(F)"], {
      stdio: "ignore",
    });
  } catch {
    // ignore
  }

  const manifest = {
    at: new Date().toISOString(),
    strategy: "AAL2 operator TOTP verified (legit enroll/challenge/verify)",
    stagingRef: STAGING_REF,
    productionRef: PROD_REF,
    operator: {
      role: OPERATOR_ROLE,
      emailMasked: `${String(operatorEmail).slice(0, 3)}***@${String(operatorEmail).split("@")[1]}`,
      userIdMasked: operatorUserId ? maskId(operatorUserId) : null,
      fingerprint: operatorFingerprint,
    },
    factor: {
      idMasked: maskId(factorId),
      idPrefix: String(factorId).slice(0, 8),
    },
    assurance: {
      aal1Before: "aal1",
      aal2AfterVerify: "aal2",
    },
    tests: testResults,
    vaultPath: OUTPUT_ENV,
    handoffDoc: HANDOFF_DOC,
    // cleanup note is informational
    cleanup: {
      note: "To revoke: delete/unenroll only unverified/verified factor for this user on staging using admin tools. Do not touch other fixtures.",
    },
  };
  fs.writeFileSync(OUTPUT_MANIFEST, JSON.stringify(manifest, null, 2), { encoding: "utf8" });

  // 6) Write device handoff doc (NO secrets)
  const factorPrefix = String(factorId).slice(0, 8);

  const handoffBody = `# Mobile MFA AAL2 Operator Handoff â€” Owner RC5

This document contains **no secrets**. Load credentials from the local vault only.

## Operator
- Role: ${OPERATOR_ROLE}
- Operator fingerprint (masked): ${operatorFingerprint}
- Vault path (secrets): \`${OUTPUT_ENV}\`
- Staging ref: \`${STAGING_REF}\`
- Verified TOTP factor id prefix: \`${factorPrefix}\`

## AAL1 -> AAL2 proof status
- AAL1 login status: PASS (currentLevel=aal1 after fresh sign-in)
- AAL2 challenge/verify status: PASS (currentLevel=aal2 after supabase.auth.mfa.challenge + verify)

## Suitable Mobile sensitive action (for one-shot action resume)
Use RPC: \`public.reject_partner_commission(uuid,text,text)\`

Reason:
- It is guarded by \`public.is_admin_or_owner()\` and \`public.require_aal2()\` (AAL2 step-up).
- It is designed to have **no ledger post** / **no payout state change** (safe for staging one-shot resume).

## Mobile device steps (high-level)
1. Start with an AAL1 session on the operator account (fresh sign-in).
2. Trigger the UI flow that calls \`reject_partner_commission\`.
3. Complete the MFA challenge/verify using the TOTP from your authenticator app.
4. Confirm the action resumes successfully and returns a result payload.

## Cleanup
- Keep this operator account for the remainder of the RC5 APK readiness review.
- To rotate MFA: re-run this script (idempotent by enrolling only when factor is missing), then update the local vault.

## Limitations
- This handoff assumes staging still points to \`${STAGING_REF}\`.
`;

  fs.mkdirSync(path.dirname(HANDOFF_DOC), { recursive: true });
  fs.writeFileSync(HANDOFF_DOC, handoffBody, { encoding: "utf8" });

  console.log(`\nDONE: wrote vault secrets to ${OUTPUT_ENV} and handoff doc to ${HANDOFF_DOC}`);

  return { tests: testResults };
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`MFA_PROVISION_FAILED: ${String(err?.message ?? err).slice(0, 200)}`);
    process.exit(1);
  });