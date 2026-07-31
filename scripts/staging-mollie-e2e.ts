/**
 * Server-only staging Mollie E2E harness.
 *
 * Usage:
 *   ALLOW_STAGING_MOLLIE_E2E=true npx tsx scripts/staging-mollie-e2e.ts
 *
 * Never prints secrets, payment URLs, full payment IDs, or webhook tokens.
 * Does not enable checkout or PAY-002.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import molliePkg from "@mollie/api-client";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  assertStagingMollieE2EGuards,
  buildStagingMollieWebhookUrl,
  detectMollieShape,
  PRODUCTION_SUPABASE_DENYLIST_REF,
  redactPaymentId,
  STAGING_SUPABASE_REF,
} from "./lib/staging-mollie-guards";

const createMollieClient =
  typeof molliePkg === "function"
    ? molliePkg
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (molliePkg as any).default || (molliePkg as any).createMollieClient;

const RUN_ID = `synth-mollie-${randomUUID().slice(0, 8)}`;
const ARTIFACT_DIR = join(tmpdir(), "vdb-staging-mollie-e2e");
const POLL_MS = 90_000;
const POLL_INTERVAL_MS = 2_500;

type PhaseResult = {
  phase: string;
  ok: boolean;
  detail?: Record<string, unknown>;
};

function loadEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function fail(code: number, message: string, extra?: Record<string, unknown>): never {
  console.log(
    JSON.stringify({
      ok: false,
      runId: RUN_ID,
      message,
      ...extra,
    }),
  );
  process.exit(code);
}

function loadSupabasePat(): string {
  const ps = `
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public class CredM {
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  public static string Read(string target) {
    IntPtr p; if (!CredRead(target, 1, 0, out p)) return null;
    try {
      var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
      byte[] bytes = new byte[c.CredentialBlobSize];
      Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize);
      string s = (c.CredentialBlobSize >= 2 && bytes[1] == 0)
        ? Encoding.Unicode.GetString(bytes) : Encoding.UTF8.GetString(bytes);
      return new string(Array.FindAll(s.ToCharArray(), ch => ch >= 32 && ch < 127)).Trim();
    } finally { CredFree(p); }
  }
}
"@
$t = [CredM]::Read('Supabase CLI:supabase')
$path = Join-Path $env:TEMP ('sb-pat-' + [guid]::NewGuid().ToString('N') + '.txt')
[IO.File]::WriteAllText($path, $t)
Write-Output $path
`;
  const out = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", ps],
    { encoding: "utf8" },
  ).trim();
  const tok = readFileSync(out, "utf8").trim();
  unlinkSync(out);
  return tok;
}

async function stagingServiceClient(): Promise<SupabaseClient> {
  const pat = loadSupabasePat();
  const keys = (await fetch(
    `https://api.supabase.com/v1/projects/${STAGING_SUPABASE_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${pat}` } },
  ).then((r) => r.json())) as Array<{ name?: string; id?: string; api_key?: string }>;

  const sr = keys.find(
    (k) => k.name === "service_role" || k.id === "service_role",
  )?.api_key;
  if (!sr) fail(2, "staging service_role unavailable");

  const url = `https://${STAGING_SUPABASE_REF}.supabase.co`;
  if (url.includes(PRODUCTION_SUPABASE_DENYLIST_REF)) {
    fail(3, "STOP — production denylist hit");
  }

  return createClient(url, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function countRows(
  admin: SupabaseClient,
  table: string,
  filter?: { column: string; value: string },
): Promise<number> {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count, error } = await q;
  if (error) fail(4, `count failed for ${table}`, { code: error.code });
  return count ?? 0;
}

async function createSyntheticOrder(
  admin: SupabaseClient,
): Promise<{ orderId: string; orderNumber: string; totalCents: number }> {
  const orderId = randomUUID();
  const productId = randomUUID();
  const orderNumber = `VDB-SYNTH-${RUN_ID.slice(-8).toUpperCase()}`;
  const unit = 100; // €1.00 ex VAT
  const vatRate = 0.21;
  const vat = Math.round(unit * vatRate);
  const total = unit + vat;

  const orderRecord = {
    id: orderId,
    order_number: orderNumber,
    status: "PENDING",
    customer_email: `${RUN_ID}@synth.staging.invalid`,
    customer_first_name: "Synth",
    customer_last_name: "Mollie",
    customer_company: null,
    customer_phone: null,
    customer_type: "CONSUMER",
    subtotal_cents: unit,
    vat_cents: vat,
    total_cents: total,
    vat_rate: vatRate,
    notes: `STAGING_MOLLIE_E2E run=${RUN_ID}`,
    confirmation_sent: false,
    delivery_released: false,
    idempotency_key: `idem-${RUN_ID}`,
    payment_init_status: "PENDING",
  };

  const { error: rpcErr } = await admin.rpc("create_order_with_items", {
    p_order: orderRecord,
    p_items: [
      {
        order_id: orderId,
        product_id: productId,
        product_name: "Synthetic Mollie E2E Product",
        product_slug: `synth-mollie-${RUN_ID}`,
        quantity: 1,
        unit_price_cents: unit,
        total_cents: unit,
        billing_type: "ONE_TIME",
      },
    ],
  });

  if (rpcErr) {
    const { error: orderError } = await admin.from("orders").insert(orderRecord);
    if (orderError) {
      fail(5, "synthetic order insert failed", { code: orderError.code });
    }
    const { error: itemsError } = await admin.from("order_items").insert({
      order_id: orderId,
      product_id: productId,
      product_name: "Synthetic Mollie E2E Product",
      product_slug: `synth-mollie-${RUN_ID}`,
      quantity: 1,
      unit_price_cents: unit,
      total_cents: unit,
      billing_type: "ONE_TIME",
    });
    if (itemsError) {
      await admin.from("orders").delete().eq("id", orderId);
      fail(5, "synthetic order_items insert failed", { code: itemsError.code });
    }
  }

  return { orderId, orderNumber, totalCents: total };
}

async function pollOrderPaid(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ status: string; paymentStatus: string | null; elapsedMs: number }> {
  const start = Date.now();
  while (Date.now() - start < POLL_MS) {
    const { data: order } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    const { data: payment } = await admin
      .from("payments")
      .select("status,provider_status")
      .eq("order_id", orderId)
      .maybeSingle();
    if (order?.status === "PAID") {
      return {
        status: order.status,
        paymentStatus: payment?.status ?? null,
        elapsedMs: Date.now() - start,
      };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  const { data: order } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  return {
    status: order?.status ?? "UNKNOWN",
    paymentStatus: null,
    elapsedMs: Date.now() - start,
  };
}

async function postWebhook(
  appUrl: string,
  token: string | null,
  paymentId: string,
): Promise<{ status: number; classification: string }> {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/mollie${
    params.toString() ? `?${params}` : ""
  }`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `id=${encodeURIComponent(paymentId)}`,
    redirect: "manual",
  });
  const text = await res.text();
  let classification = `status_${res.status}`;
  if (/Unauthorized/i.test(text)) classification = "unauthorized";
  else if (/Payment not found/i.test(text)) classification = "payment_not_found";
  else if (/Missing payment/i.test(text)) classification = "missing_payment_id";
  else if (/received/i.test(text)) classification = "received";
  else if (/vercel|authentication required/i.test(text)) {
    classification = "vercel_intercept";
  }
  return { status: res.status, classification };
}

async function completeMollieTestCheckout(checkoutUrlPath: string): Promise<boolean> {
  const checkoutUrl = readFileSync(checkoutUrlPath, "utf8").trim();
  unlinkSync(checkoutUrlPath);
  if (!checkoutUrl.startsWith("https://")) {
    return false;
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Classic Mollie hosted flow: method → issuer → test-mode final_state=paid → Continue
    if (await page.locator('button[name="method"][value="ideal"]').count()) {
      await page.locator('button[name="method"][value="ideal"]').click();
      await page.waitForTimeout(1_000);
    }
    if (await page.getByRole("button", { name: /^ING$/i }).count()) {
      await page.getByRole("button", { name: /^ING$/i }).click();
      await page.waitForTimeout(1_500);
    }

    await page.waitForURL(/test-mode/, { timeout: 20_000 }).catch(() => undefined);
    if (await page.locator("select[name='locale']").count()) {
      await page
        .locator("select[name='locale']")
        .selectOption("en_US")
        .catch(() => undefined);
      await page.waitForTimeout(500);
    }

    const paidRadio = page.locator(
      'input[type="radio"][name="final_state"][value="paid"]',
    );
    if ((await paidRadio.count()) === 0) return false;
    await paidRadio.click({ force: true });
    await page.evaluate(() => {
      const el = document.querySelector(
        'input[type="radio"][name="final_state"][value="paid"]',
      ) as HTMLInputElement | null;
      if (el) {
        el.checked = true;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await page.locator('button[name="submit"]').click();
    await page.waitForTimeout(3_000);
    return true;
  } finally {
    await browser.close();
  }
}

async function cleanupSynthetic(
  admin: SupabaseClient,
  orderId: string,
  paymentId: string | null,
): Promise<Record<string, unknown>> {
  // Financial / webhook_events are append-oriented — mark ownership via notes filter only.
  // Delete non-financial synthetic rows; leave webhook_events if policy prefers append-only.
  const result: Record<string, unknown> = { runId: RUN_ID, mode: "scoped" };

  if (paymentId) {
    const { count: weBefore } = await admin
      .from("webhook_events")
      .select("*", { count: "exact", head: true })
      .eq("payment_id", paymentId);
    result.webhook_events_for_payment = weBefore ?? 0;
    // Keep webhook_events (append-only evidence); report only.
  }

  await admin.from("payments").delete().eq("order_id", orderId);
  await admin.from("order_items").delete().eq("order_id", orderId);
  const { error: delOrder } = await admin.from("orders").delete().eq("id", orderId);
  result.order_deleted = !delOrder;
  if (delOrder) {
    // If FK/ledger blocks delete, leave marked synthetic row.
    result.order_retained_marked = true;
    await admin
      .from("orders")
      .update({ notes: `STAGING_MOLLIE_E2E_RETAINED run=${RUN_ID}` })
      .eq("id", orderId);
  }

  return result;
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const fileEnv = loadEnvFile(".env.local");
  const mollieKey = process.env.MOLLIE_API_KEY || fileEnv.MOLLIE_API_KEY;
  const webhookToken =
    process.env.MOLLIE_WEBHOOK_TOKEN ||
    fileEnv.MOLLIE_WEBHOOK_TOKEN ||
    process.env.MOLLIE_WEBHOOK_SECRET ||
    fileEnv.MOLLIE_WEBHOOK_SECRET;
  const stagingAppUrl =
    process.env.STAGING_APP_URL ||
    fileEnv.STAGING_APP_URL ||
    "https://vdb-digital-staging-r9qi6l84p-matthijs-projects-301cd812.vercel.app";

  const guard = assertStagingMollieE2EGuards({
    allowFlag: process.env.ALLOW_STAGING_MOLLIE_E2E,
    mollieApiKey: mollieKey,
    checkoutEnabled: process.env.CHECKOUT_ENABLED ?? fileEnv.CHECKOUT_ENABLED,
    stagingAppUrl,
    supabaseUrl: `https://${STAGING_SUPABASE_REF}.supabase.co`,
    supabaseRef: STAGING_SUPABASE_REF,
  });

  if (!guard.ok) {
    if (guard.code === "LIVE_MOLLIE") {
      fail(10, guard.message, { code: guard.code });
    }
    fail(11, guard.message, { code: guard.code });
  }

  if (!webhookToken) {
    fail(12, "MOLLIE_WEBHOOK_TOKEN/SECRET absent — cannot authenticate webhook");
  }

  const results: PhaseResult[] = [];
  const admin = await stagingServiceClient();

  const before = {
    orders: await countRows(admin, "orders"),
    payments: await countRows(admin, "payments"),
    webhook_events: await countRows(admin, "webhook_events"),
  };

  const { orderId, orderNumber, totalCents } = await createSyntheticOrder(admin);
  results.push({
    phase: "synthetic_order",
    ok: true,
    detail: { orderIdPrefix: orderId.slice(0, 8), orderNumber, totalCents },
  });

  const webhookUrl = buildStagingMollieWebhookUrl(stagingAppUrl, webhookToken);
  const mollie = createMollieClient({ apiKey: mollieKey! });

  // One payment per run-ID
  let paymentId: string | null = null;
  let mode: string | null = null;
  try {
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (totalCents / 100).toFixed(2),
      },
      description: `Synth ${RUN_ID}`,
      redirectUrl: `${stagingAppUrl.replace(/\/$/, "")}/checkout/success?order=${orderId}`,
      cancelUrl: `${stagingAppUrl.replace(/\/$/, "")}/checkout/cancelled?order=${orderId}`,
      webhookUrl,
      metadata: {
        orderId,
        orderNumber,
        runId: RUN_ID,
      },
    });
    paymentId = payment.id;
    mode = (payment as { mode?: string }).mode ?? "unknown";
    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) fail(13, "Mollie checkout URL missing");
    if (!paymentId) fail(13, "Mollie payment id missing");
    const pid = paymentId;
    const token = webhookToken as string;

    const checkoutPath = join(ARTIFACT_DIR, `${RUN_ID}-checkout.url`);
    writeFileSync(checkoutPath, checkoutUrl, { mode: 0o600 });

    await admin
      .from("orders")
      .update({
        payment_init_status: "CREATED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await admin.from("payments").upsert({
      id: pid,
      order_id: orderId,
      status: "OPEN",
      amount_cents: totalCents,
      provider_status: "open",
    });

    results.push({
      phase: "payment_create",
      ok: mode === "test" || detectMollieShape(mollieKey) === "test",
      detail: {
        paymentIdPrefix: redactPaymentId(pid),
        providerMode: mode,
        keyShape: detectMollieShape(mollieKey),
      },
    });

    if (mode && mode !== "test") {
      fail(14, "Provider response was not test mode", { mode });
    }

    const completed = await completeMollieTestCheckout(checkoutPath);
    results.push({
      phase: "hosted_test_checkout",
      ok: completed,
      detail: { interacted: completed },
    });
    if (!completed) {
      fail(15, "Could not complete Mollie hosted test checkout UI");
    }

    // Wait for real Mollie webhook delivery — do not simulate first.
    const paid = await pollOrderPaid(admin, orderId);
    results.push({
      phase: "real_webhook_poll",
      ok: paid.status === "PAID",
      detail: paid,
    });

    if (paid.status !== "PAID") {
      // Diagnostic: one authenticated delivery attempt only if Mollie did not land.
      const probe = await postWebhook(stagingAppUrl, token, pid);
      results.push({
        phase: "diagnostic_authenticated_post",
        ok: probe.classification === "received",
        detail: probe,
      });
      fail(16, "Order did not become PAID after Mollie test checkout + poll", {
        paid,
        hint:
          probe.classification === "unauthorized"
            ? "Preview webhook token mismatch — redeploy Preview with matching token"
            : "webhook may not have reached app",
      });
    }

    const weAfterPaid = await countRows(admin, "webhook_events", {
      column: "payment_id",
      value: pid,
    });
    const { data: orderAfter } = await admin
      .from("orders")
      .select("status,delivery_released")
      .eq("id", orderId)
      .maybeSingle();
    const { data: paymentAfter } = await admin
      .from("payments")
      .select("status,provider_status,amount_cents")
      .eq("id", pid)
      .maybeSingle();

    results.push({
      phase: "after_state",
      ok: orderAfter?.status === "PAID",
      detail: {
        orderStatus: orderAfter?.status,
        deliveryReleased: orderAfter?.delivery_released,
        paymentStatus: paymentAfter?.status,
        providerStatus: paymentAfter?.provider_status,
        webhookEventsForPayment: weAfterPaid,
      },
    });

    // Duplicate delivery
    const dup = await postWebhook(stagingAppUrl, token, pid);
    const weAfterDup = await countRows(admin, "webhook_events", {
      column: "payment_id",
      value: pid,
    });
    const { data: orderDup } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    results.push({
      phase: "duplicate_webhook",
      ok:
        (dup.status === 200 || dup.classification === "received") &&
        orderDup?.status === "PAID" &&
        weAfterDup === weAfterPaid,
      detail: {
        http: dup,
        orderStatus: orderDup?.status,
        webhookEventsBefore: weAfterPaid,
        webhookEventsAfter: weAfterDup,
      },
    });

    // Unknown ID
    const unknown = await postWebhook(
      stagingAppUrl,
      token,
      "tr_synth_unknown_xyz_001",
    );
    const { data: orderUnknown } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    results.push({
      phase: "unknown_payment_id",
      ok:
        unknown.status === 400 &&
        unknown.classification === "payment_not_found" &&
        orderUnknown?.status === "PAID",
      detail: { http: unknown, orderUnchanged: orderUnknown?.status === "PAID" },
    });

    // Missing / manipulated token
    const missingTok = await postWebhook(stagingAppUrl, null, pid);
    const badTok = await postWebhook(stagingAppUrl, "manipulated_token_value", pid);
    results.push({
      phase: "token_faults",
      ok:
        missingTok.status === 401 &&
        badTok.status === 401 &&
        missingTok.classification === "unauthorized" &&
        badTok.classification === "unauthorized",
      detail: { missing: missingTok, manipulated: badTok },
    });
  } finally {
    const cleanup = await cleanupSynthetic(admin, orderId, paymentId);
    results.push({ phase: "cleanup", ok: true, detail: cleanup });
  }

  const allOk = results.every((r) => r.ok);
  console.log(
    JSON.stringify(
      {
        ok: allOk,
        runId: RUN_ID,
        stagingRef: STAGING_SUPABASE_REF,
        bypassRequired: false,
        before,
        results,
        checkoutStillDisabled: true,
        pay002StillOpen: true,
      },
      null,
      2,
    ),
  );
  process.exit(allOk ? 0 : 20);
}

main().catch((err) => {
  fail(99, "harness crashed", {
    name: err instanceof Error ? err.name : "unknown",
  });
});
