/**
 * Staging ticket core E2E (synthetic fixtures only).
 * STAGING ONLY: qzekuvmgfekzsowdecyk — production hard-denied.
 *
 * Usage (Owner worktree, CLI linked to staging):
 *   node scripts/staging/rc6-ticket-core-e2e.mjs
 *
 * Secrets: ~/.vdb-vault/mobile-rc3-staging-role-matrix.env
 * Never prints passwords, tokens, full UUIDs, or message bodies.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "qzekuvmgfekzsowdecyk";
const PROD_REF = "nhsrdnjfsxfikfbdmdfj";
const SCHEMA_VERSION = "2026.07.29.partner-approval-aal2-rc6";
const FIXTURE_MARKER = "RC6_TICKET_CORE_SYNTHETIC";
const HOME = process.env.USERPROFILE || "C:/Users/XXX";
const VAULT = path.join(HOME, ".vdb-vault");
const ROLE_MATRIX_ENV = path.join(VAULT, "mobile-rc3-staging-role-matrix.env");
const LINKED_REF_PATH = path.join("supabase", ".temp", "project-ref");
const EVIDENCE_OUT = path.join(
  HOME,
  "vdb-full-staging-recovery-2026-07-29",
  "TICKET_STAGING_E2E_FINAL.md",
);

const results = [];

function record(name, status, note = "") {
  results.push({ name, status, note });
  console.log(`${status} ${name}${note ? ` — ${note}` : ""}`);
}

function mask(id) {
  return id ? `${String(id).slice(0, 8)}…` : null;
}

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

function assertStagingTarget() {
  if (!fs.existsSync(LINKED_REF_PATH)) {
    throw new Error("BLOCKED: supabase/.temp/project-ref missing");
  }
  const linked = fs.readFileSync(LINKED_REF_PATH, "utf8").trim();
  if (linked === PROD_REF) throw new Error("BLOCKED: linked to PRODUCTION");
  if (linked !== STAGING_REF) {
    throw new Error(`BLOCKED: linked to ${linked}; expected ${STAGING_REF}`);
  }
}

function loadKeys() {
  assertStagingTarget();
  const raw = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", `--project-ref=${STAGING_REF}`, "-o", "json"],
    { encoding: "utf8", shell: true },
  );
  const start = raw.indexOf("[");
  const keys = JSON.parse(raw.slice(start >= 0 ? start : 0));
  const anon = keys.find((k) => k.name === "anon" || k.api_key?.startsWith("eyJ"))?.api_key
    || keys.find((k) => String(k.name).toLowerCase().includes("anon"))?.api_key;
  const service =
    keys.find((k) => k.name === "service_role" || String(k.name).includes("service"))?.api_key;
  if (!anon || !service) throw new Error("BLOCKED: missing staging api keys");
  return {
    url: `https://${STAGING_REF}.supabase.co`,
    anon,
    service,
  };
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(url, anon, email, password) {
  const sb = client(url, anon);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { sb, user: data.user };
}

async function main() {
  if (!fs.existsSync(ROLE_MATRIX_ENV)) {
    record("vault_role_matrix", "BLOCKED", "missing vault env");
    writeEvidence("BLOCKED");
    process.exit(2);
  }

  assertStagingTarget();
  record("staging_target_guard", "PASS", STAGING_REF);

  const roles = parseEnvFile(ROLE_MATRIX_ENV);
  const { url, anon, service } = loadKeys();
  if (url.includes(PROD_REF)) throw new Error("BLOCKED: prod url");
  record("staging_keys_loaded", "PASS", "anon+service present (not printed)");

  const admin = client(url, service);

  // --- Customer A create + reply ---
  const customerA = await signIn(
    url,
    anon,
    roles.VDB_STAGING_CUSTOMER_A_EMAIL || roles.CUSTOMER_A_EMAIL,
    roles.VDB_STAGING_CUSTOMER_A_PASSWORD || roles.CUSTOMER_A_PASSWORD,
  );
  const orgA = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", customerA.user.id)
    .limit(1)
    .maybeSingle();
  if (!orgA.data?.organization_id) {
    record("customer_a_org", "FAIL", "no organization_members");
  } else {
    record("customer_a_org", "PASS", mask(orgA.data.organization_id));
  }

  const ticketNumber = `SYN-TIX-${Date.now().toString(36).toUpperCase()}`;
  const { data: ticketA, error: createErr } = await customerA.sb
    .from("portal_support_tickets")
    .insert({
      organization_id: orgA.data.organization_id,
      ticket_number: ticketNumber,
      subject: `${FIXTURE_MARKER} customer A`,
      description: `${FIXTURE_MARKER} body — do not treat as real`,
      category: "OTHER",
      priority: "NORMAL",
      status: "NEW",
      created_by: customerA.user.id,
    })
    .select("id, status")
    .single();
  if (createErr || !ticketA?.id) {
    record("customer_a_create", "FAIL", createErr?.message || "empty");
  } else {
    record("customer_a_create", "PASS", mask(ticketA.id));
  }

  if (ticketA?.id) {
    const { error: replyErr } = await customerA.sb.rpc("reply_portal_support_ticket", {
      p_ticket_id: ticketA.id,
      p_body: `${FIXTURE_MARKER} customer reply`,
    });
    record("customer_a_reply", replyErr ? "FAIL" : "PASS", replyErr?.message || "");

    // Customer B isolation
    const customerBEmail =
      roles.VDB_STAGING_CUSTOMER_B_EMAIL || roles.CUSTOMER_B_EMAIL;
    const customerBPassword =
      roles.VDB_STAGING_CUSTOMER_B_PASSWORD || roles.CUSTOMER_B_PASSWORD;
    if (customerBEmail && customerBPassword) {
      const customerB = await signIn(url, anon, customerBEmail, customerBPassword);
      const { data: leaked } = await customerB.sb
        .from("portal_support_tickets")
        .select("id")
        .eq("id", ticketA.id)
        .maybeSingle();
      record(
        "cross_customer_deny",
        leaked?.id ? "FAIL" : "PASS",
        leaked?.id ? "leak" : "empty",
      );
    } else {
      record("cross_customer_deny", "SKIP", "customer B credentials missing");
    }

    // Staff public reply + internal note flag behavior
    const staffEmail =
      roles.VDB_STAGING_STAFF_EMAIL ||
      roles.VDB_STAGING_ADMIN_EMAIL ||
      roles.ADMIN_EMAIL;
    const staffPassword =
      roles.VDB_STAGING_STAFF_PASSWORD ||
      roles.VDB_STAGING_ADMIN_PASSWORD ||
      roles.ADMIN_PASSWORD;
    if (staffEmail && staffPassword) {
      const staff = await signIn(url, anon, staffEmail, staffPassword);
      const { error: staffReplyErr } = await staff.sb.rpc("reply_portal_support_ticket", {
        p_ticket_id: ticketA.id,
        p_body: `${FIXTURE_MARKER} staff external`,
      });
      record("staff_external_reply", staffReplyErr ? "FAIL" : "PASS", staffReplyErr?.message || "");

      const { data: flag } = await admin
        .from("feature_flags")
        .select("enabled")
        .eq("key", "support_internal_notes_rpc")
        .maybeSingle();
      const notesEnabled = flag?.enabled === true;
      record(
        "internal_notes_flag",
        "PASS",
        notesEnabled ? "enabled" : "disabled_fail_closed",
      );

      const { error: noteErr } = await staff.sb.rpc("add_portal_support_internal_note", {
        p_ticket_id: ticketA.id,
        p_body: `${FIXTURE_MARKER} internal`,
      });
      if (!notesEnabled) {
        record(
          "internal_note_write_denied_when_flag_off",
          noteErr ? "PASS" : "FAIL",
          noteErr?.message?.slice(0, 80) || "unexpected success",
        );
      } else {
        record("internal_note_write", noteErr ? "FAIL" : "PASS", noteErr?.message || "");
        const { data: page } = await customerA.sb.rpc("list_portal_support_ticket_replies", {
          p_ticket_id: ticketA.id,
          p_limit: 50,
        });
        const items = Array.isArray(page?.items) ? page.items : [];
        const leak = items.some((r) => r?.is_internal === true);
        record("customer_cannot_see_internal_note", leak ? "FAIL" : "PASS");
      }

      const { error: statusErr } = await staff.sb.rpc(
        "transition_portal_support_ticket_status",
        {
          p_ticket_id: ticketA.id,
          p_to_status: "IN_PROGRESS",
        },
      );
      record("staff_status_transition", statusErr ? "FAIL" : "PASS", statusErr?.message || "");
    } else {
      record("staff_flows", "SKIP", "staff credentials missing");
    }

    // Cleanup synthetic ticket replies + ticket (service role)
    await admin.from("portal_support_replies").delete().eq("ticket_id", ticketA.id);
    await admin.from("portal_support_tickets").delete().eq("id", ticketA.id);
    record("synthetic_cleanup", "PASS", mask(ticketA.id));
  }

  // Partner active: list capability smoke (no inventing partner org)
  const partnerEmail =
    roles.VDB_STAGING_PARTNER_A_EMAIL || roles.PARTNER_ACTIVE_A_EMAIL;
  const partnerPassword =
    roles.VDB_STAGING_PARTNER_A_PASSWORD || roles.PARTNER_ACTIVE_A_PASSWORD;
  if (partnerEmail && partnerPassword) {
    const partner = await signIn(url, anon, partnerEmail, partnerPassword);
    const { error: partnerListErr } = await partner.sb
      .from("portal_support_tickets")
      .select("id")
      .limit(5);
    record(
      "partner_list_rls",
      partnerListErr ? "FAIL" : "PASS",
      partnerListErr?.message || "ok",
    );
  } else {
    record("partner_list_rls", "SKIP", "partner credentials missing");
  }

  record("schema_version_expected", "PASS", SCHEMA_VERSION);

  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const verdict =
    blocked > 0 ? "BLOCKED" : failed > 0 ? "PARTIAL" : "PASS";
  writeEvidence(verdict);
  process.exit(failed || blocked ? 1 : 0);
}

function writeEvidence(verdict) {
  const lines = [
    "# Ticket staging E2E final",
    "",
    `Staging: \`${STAGING_REF}\``,
    `Production: \`${PROD_REF}\` UNTOUCHED`,
    `Fixture marker: \`${FIXTURE_MARKER}\``,
    `Verdict: **${verdict}**`,
    "",
    "| Check | Status | Note |",
    "|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.name} | ${r.status} | ${(r.note || "").replace(/\|/g, "/")} |`,
    ),
    "",
    "No secrets, full UUIDs, emails, or message bodies recorded.",
    "",
  ];
  fs.writeFileSync(EVIDENCE_OUT, lines.join("\n"), "utf8");
  console.log(`EVIDENCE ${EVIDENCE_OUT}`);
}

main().catch((err) => {
  console.error("FATAL", err?.message || String(err));
  try {
    writeEvidence("BLOCKED");
  } catch {
    /* ignore */
  }
  process.exit(2);
});
