/**
 * FORENSICS ONLY — real Chrome cookie/network capture for portal F5 auth loss.
 * Never logs cookie/token values. No production deploy.
 *
 * Usage: npx tsx scripts/forensics-chrome-portal-f5.ts
 */
import { chromium, type BrowserContext, type Cookie, type Page } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = "https://vdbdigital.nl";
const OUT_DIR = path.join(
  os.tmpdir(),
  `vdb-chrome-forensics-${Date.now()}`,
);
const REPORT = path.join(OUT_DIR, "report.json");

type SafeCookie = {
  name: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  session: boolean;
  valueLength: number;
};

type NetEvent = {
  kind: string;
  requestId?: string;
  url?: string;
  method?: string;
  type?: string;
  status?: number;
  cookieNamesSent?: string[];
  associatedCookies?: Array<{
    name: string;
    valueLength?: number;
    blockedReasons?: string[];
    exclusionReasons?: string[];
  }>;
  setCookieSafe?: Array<Record<string, unknown>>;
  responseHeadersSafe?: Record<string, string | string[]>;
  redirectStatus?: number;
  location?: string;
  t: number;
};

function isAuthName(name: string): boolean {
  return (
    (name.startsWith("sb-") && name.includes("auth-token")) ||
    name.includes("code-verifier")
  );
}

function relevantUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.origin !== BASE) return false;
    const p = u.pathname;
    return (
      p.startsWith("/portal") ||
      p.startsWith("/inloggen") ||
      p.startsWith("/uitloggen") ||
      p.startsWith("/geen-toegang") ||
      p.startsWith("/auth/callback") ||
      u.search.includes("_rsc")
    );
  } catch {
    return false;
  }
}

function safeCookie(c: Cookie): SafeCookie {
  return {
    name: c.name,
    domain: c.domain,
    path: c.path,
    expires: c.expires,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: String(c.sameSite),
    session: !c.expires || c.expires < 0,
    valueLength: c.value?.length ?? 0,
  };
}

function authSnapshot(cookies: Cookie[]): {
  auth: SafeCookie[];
  allCount: number;
  authHeaderApproxBytes: number;
} {
  const auth = cookies.filter((c) => isAuthName(c.name)).map(safeCookie);
  const authHeaderApproxBytes = auth.reduce(
    (sum, c) => sum + c.name.length + 1 + c.valueLength + 2,
    0,
  );
  return { auth, allCount: cookies.length, authHeaderApproxBytes };
}

function parseSetCookieSafe(raw: string): Record<string, unknown> {
  const parts = raw.split(";").map((p) => p.trim());
  const [nv, ...attrs] = parts;
  const eq = nv.indexOf("=");
  const name = eq >= 0 ? nv.slice(0, eq) : nv;
  const valueLen = eq >= 0 ? nv.slice(eq + 1).length : 0;
  const out: Record<string, unknown> = {
    name,
    valueLength: valueLen,
    action: valueLen === 0 ? "CLEAR" : "SET",
  };
  for (const a of attrs) {
    const lower = a.toLowerCase();
    if (lower.startsWith("path=")) out.path = a.slice(5);
    else if (lower.startsWith("domain=")) out.domain = a.slice(7);
    else if (lower.startsWith("max-age=")) {
      out.maxAge = a.slice(8);
      if (a.slice(8) === "0") {
        out.action = "CLEAR";
        out.maxAgeZero = true;
      }
    } else if (lower.startsWith("expires=")) out.expires = a.slice(8);
    else if (lower.startsWith("samesite=")) out.sameSite = a.slice(9);
    else if (lower === "secure") out.secure = true;
    else if (lower === "httponly") out.httpOnly = true;
  }
  return out;
}

function headerMapSafe(
  headers: Array<{ name: string; value: string }> | Record<string, string>,
): Record<string, string | string[]> {
  const entries = Array.isArray(headers)
    ? headers.map((h) => [h.name, h.value] as const)
    : Object.entries(headers);
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of entries) {
    const lk = k.toLowerCase();
    if (
      lk === "set-cookie" ||
      lk === "x-middleware-set-cookie" ||
      lk.startsWith("x-vdb-") ||
      lk === "cache-control" ||
      lk === "location" ||
      lk === "content-type"
    ) {
      if (lk === "set-cookie" || lk === "x-middleware-set-cookie") {
        const parsed = parseSetCookieSafe(v);
        const key = lk;
        const prev = out[key];
        const asJson = JSON.stringify(parsed);
        if (!prev) out[key] = asJson;
        else if (Array.isArray(prev)) prev.push(asJson);
        else out[key] = [prev, asJson];
      } else {
        out[lk] = v;
      }
    }
  }
  return out;
}

async function installCdpNetwork(context: BrowserContext, sink: NetEvent[]) {
  const cdp = await context.newCDPSession(context.pages()[0] || (await context.newPage()));
  // Attach to every page
  context.on("page", async (page) => {
    try {
      const session = await context.newCDPSession(page);
      await wireSession(session, sink);
    } catch {
      // ignore
    }
  });
  await wireSession(cdp, sink);
  return cdp;
}

async function wireSession(
  session: Awaited<ReturnType<BrowserContext["newCDPSession"]>>,
  sink: NetEvent[],
) {
  await session.send("Network.enable");
  session.on("Network.requestWillBeSent", (params: {
    requestId: string;
    request: { url: string; method: string; headers?: Record<string, string> };
    type?: string;
    initiator?: { type?: string; url?: string; stack?: unknown };
    redirectResponse?: { status: number; headers?: Record<string, string>; url?: string };
  }) => {
    if (!relevantUrl(params.request.url)) return;
    const cookieHeader = params.request.headers?.cookie || params.request.headers?.Cookie;
    const names = cookieHeader
      ? cookieHeader
          .split(";")
          .map((p) => p.trim().split("=")[0])
          .filter((n) => isAuthName(n))
      : [];
    const reqHeaders = params.request.headers || {};
    sink.push({
      kind: "requestWillBeSent",
      requestId: params.requestId,
      url: params.request.url.split("?")[0] + (params.request.url.includes("_rsc") ? "?_rsc" : ""),
      method: params.request.method,
      type: params.type,
      cookieNamesSent: names,
      redirectStatus: params.redirectResponse?.status,
      location: params.redirectResponse?.headers?.location,
      responseHeadersSafe: {
        "rsc": reqHeaders["rsc"] || reqHeaders["RSC"] || "no",
        "next-router-prefetch":
          reqHeaders["next-router-prefetch"] ||
          reqHeaders["Next-Router-Prefetch"] ||
          "no",
        "next-router-state-tree":
          reqHeaders["next-router-state-tree"] ||
          reqHeaders["Next-Router-State-Tree"]
            ? "yes"
            : "no",
        "purpose":
          reqHeaders["purpose"] ||
          reqHeaders["Purpose"] ||
          reqHeaders["sec-purpose"] ||
          reqHeaders["Sec-Purpose"] ||
          "",
        "initiator": params.initiator?.type || "",
      },
      t: Date.now(),
    });
  });

  session.on("Network.requestWillBeSentExtraInfo", (params: {
    requestId: string;
    headers?: Record<string, string>;
    associatedCookies?: Array<{
      cookie?: { name?: string; value?: string };
      blockedReasons?: string[];
      exemptionReason?: string;
      partitionKey?: unknown;
    }>;
    clientSecurityState?: unknown;
  }) => {
    const cookieHeader = params.headers?.cookie || params.headers?.Cookie;
    const namesFromHeader = cookieHeader
      ? cookieHeader
          .split(";")
          .map((p) => p.trim().split("=")[0])
          .filter((n) => isAuthName(n))
      : [];
    const associated =
      params.associatedCookies
        ?.map((ac) => ({
          name: ac.cookie?.name || "unknown",
          valueLength: ac.cookie?.value?.length,
          blockedReasons: ac.blockedReasons || [],
          exclusionReasons: ac.blockedReasons || [],
          exemptionReason: (ac as { exemptionReason?: string }).exemptionReason,
        }))
        .filter((c) => isAuthName(c.name) || (c.blockedReasons?.length ?? 0) > 0) || [];
    if (namesFromHeader.length === 0 && associated.length === 0) {
      // still record if we can tie later via requestId — store minimal
      sink.push({
        kind: "requestWillBeSentExtraInfo",
        requestId: params.requestId,
        cookieNamesSent: namesFromHeader,
        associatedCookies: associated,
        t: Date.now(),
      });
      return;
    }
    sink.push({
      kind: "requestWillBeSentExtraInfo",
      requestId: params.requestId,
      cookieNamesSent: namesFromHeader,
      associatedCookies: associated,
      t: Date.now(),
    });
  });

  session.on("Network.responseReceived", (params: {
    requestId: string;
    type?: string;
    response: {
      url: string;
      status: number;
      headers: Record<string, string>;
    };
  }) => {
    if (!relevantUrl(params.response.url)) return;
    sink.push({
      kind: "responseReceived",
      requestId: params.requestId,
      url:
        params.response.url.split("?")[0] +
        (params.response.url.includes("_rsc") ? "?_rsc" : ""),
      status: params.response.status,
      type: params.type,
      responseHeadersSafe: headerMapSafe(params.response.headers),
      t: Date.now(),
    });
  });

  session.on("Network.responseReceivedExtraInfo", (params: {
    requestId: string;
    headers?: Record<string, string>;
    headersText?: string;
    blockedCookies?: Array<{
      blockedReasons?: string[];
      cookieLine?: string;
      cookie?: { name?: string };
    }>;
  }) => {
    const headers = params.headers || {};
    const setCookies: string[] = [];
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === "set-cookie") setCookies.push(v);
    }
    // headersText may contain multiple Set-Cookie lines
    if (params.headersText) {
      for (const line of params.headersText.split(/\r?\n/)) {
        if (/^set-cookie:/i.test(line)) {
          setCookies.push(line.replace(/^set-cookie:\s*/i, ""));
        }
      }
    }
    const authRelated = setCookies
      .map(parseSetCookieSafe)
      .filter((c) => typeof c.name === "string" && isAuthName(String(c.name)));
    const blocked = (params.blockedCookies || [])
      .map((b) => ({
        name: b.cookie?.name || b.cookieLine?.split("=")[0] || "unknown",
        blockedReasons: b.blockedReasons || [],
      }))
      .filter((b) => isAuthName(b.name) || b.blockedReasons.length > 0);

    if (
      authRelated.length === 0 &&
      blocked.length === 0 &&
      !Object.keys(headers).some((k) => k.toLowerCase().startsWith("x-vdb-"))
    ) {
      sink.push({
        kind: "responseReceivedExtraInfo",
        requestId: params.requestId,
        setCookieSafe: authRelated,
        responseHeadersSafe: headerMapSafe(headers),
        t: Date.now(),
      });
      return;
    }
    sink.push({
      kind: "responseReceivedExtraInfo",
      requestId: params.requestId,
      setCookieSafe: authRelated,
      responseHeadersSafe: headerMapSafe(headers),
      associatedCookies: blocked.map((b) => ({
        name: b.name,
        blockedReasons: b.blockedReasons,
        exclusionReasons: b.blockedReasons,
      })),
      t: Date.now(),
    });
  });
}

async function snap(label: string, context: BrowserContext, page: Page) {
  const cookies = await context.cookies(BASE);
  const shot = authSnapshot(cookies);
  const url = page.url();
  return { label, url, at: new Date().toISOString(), ...shot };
}

async function waitForPortal(page: Page, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (url.includes("/portal") && !url.includes("/inloggen")) return;
    await page.waitForTimeout(1000);
  }
  throw new Error("Timed out waiting for human Google login → /portal");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const userDataDir = path.join(OUT_DIR, "chrome-profile");
  const net: NetEvent[] = [];
  const snapshots: unknown[] = [];

  console.log(JSON.stringify({ type: "forensics_start", outDir: OUT_DIR }));
  console.log(
    JSON.stringify({
      type: "forensics_instruction",
      message:
        "Complete Google login in the headed Chrome window. Automation resumes at /portal.",
    }),
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());
  await installCdpNetwork(context, net);

  // Re-wire CDP on the active page explicitly
  const cdp = await context.newCDPSession(page);
  await wireSession(cdp, net);

  const version = await page.evaluate(() => navigator.userAgent);
  console.log(JSON.stringify({ type: "browser", userAgent: version }));

  await page.goto(`${BASE}/inloggen`, { waitUntil: "domcontentloaded" });
  console.log(
    JSON.stringify({
      type: "await_human_login",
      url: page.url(),
      timeoutMinutes: 10,
    }),
  );

  await waitForPortal(page, 10 * 60 * 1000);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  snapshots.push(await snap("A_after_login_portal", context, page));
  console.log(JSON.stringify({ type: "snapshot", snap: snapshots.at(-1) }));

  // Control: hard reload of /portal (session must survive document nav)
  await page.goto(`${BASE}/portal`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  snapshots.push(await snap("probe_before_reload", context, page));
  const portalBeforeUrl = page.url();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  snapshots.push(await snap("probe_after_reload", context, page));
  const portalAfterUrl = page.url();
  const probePass =
    portalBeforeUrl.includes("/portal") &&
    !portalBeforeUrl.includes("/inloggen") &&
    portalAfterUrl.includes("/portal") &&
    !portalAfterUrl.includes("/inloggen");
  console.log(
    JSON.stringify({
      type: "probe_control",
      before: portalBeforeUrl,
      after: portalAfterUrl,
      pass: probePass,
    }),
  );

  // Back to portal for soft-nav
  await page.goto(`${BASE}/portal`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  snapshots.push(await snap("B_before_soft_nav", context, page));
  console.log(JSON.stringify({ type: "snapshot", snap: snapshots.at(-1) }));

  const softNetStart = net.length;
  // Real Link click — soft navigation
  const projectenLink = page.getByRole("link", { name: "Projecten" }).first();
  await projectenLink.click();
  await page.waitForURL(/\/portal\/projecten/, { timeout: 20000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  snapshots.push(await snap("C_after_soft_nav_before_f5", context, page));
  console.log(JSON.stringify({ type: "snapshot", snap: snapshots.at(-1) }));
  snapshots.push(await snap("D_immediately_before_f5", context, page));

  const softEvents = net.slice(softNetStart);
  const softSetCookies = softEvents.flatMap((e) => e.setCookieSafe || []);
  const cookieKillers = softEvents
    .filter(
      (e) =>
        e.kind === "responseReceivedExtraInfo" &&
        (e.setCookieSafe || []).some((c) => c.action === "CLEAR"),
    )
    .map((e) => {
      const req = softEvents.find(
        (r) => r.kind === "requestWillBeSent" && r.requestId === e.requestId,
      );
      const resp = softEvents.find(
        (r) => r.kind === "responseReceived" && r.requestId === e.requestId,
      );
      const redirectFollow = softEvents.find(
        (r) =>
          r.kind === "requestWillBeSent" &&
          r.requestId === e.requestId &&
          r.redirectStatus,
      );
      return {
        requestId: e.requestId,
        requestUrl: req?.url ?? redirectFollow?.url ?? null,
        method: req?.method ?? null,
        type: req?.type ?? resp?.type ?? null,
        requestMeta: req?.responseHeadersSafe ?? null,
        status: resp?.status ?? redirectFollow?.redirectStatus ?? null,
        location:
          redirectFollow?.location ||
          (resp?.responseHeadersSafe?.location as string | undefined) ||
          null,
        setCookieSafe: e.setCookieSafe,
        responseHeadersSafe: e.responseHeadersSafe,
      };
    });
  console.log(
    JSON.stringify({
      type: "soft_nav_set_cookie_summary",
      count: softSetCookies.length,
      items: softSetCookies,
      cookieKillers,
    }),
  );

  const f5NetStart = net.length;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const afterF5Url = page.url();
  snapshots.push(await snap("E_after_f5", context, page));
  console.log(
    JSON.stringify({
      type: "after_f5",
      url: afterF5Url,
      snap: snapshots.at(-1),
    }),
  );

  const f5Events = net.slice(f5NetStart);
  const f5DocReq = f5Events.filter(
    (e) =>
      e.kind === "requestWillBeSent" &&
      e.url?.includes("/portal/projecten") &&
      !e.url.includes("?_rsc") &&
      e.method === "GET",
  );
  const f5Extra = f5Events.filter(
    (e) => e.kind === "requestWillBeSentExtraInfo",
  );
  console.log(
    JSON.stringify({
      type: "f5_request_summary",
      docReqs: f5DocReq,
      extrasSample: f5Extra.slice(0, 20),
    }),
  );

  snapshots.push(await snap("F_final", context, page));

  // Documenten sequence
  let documenten: unknown = null;
  try {
    await page.goto(`${BASE}/portal`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    if (!page.url().includes("/inloggen")) {
      const beforeDoc = await snap("doc_before_soft", context, page);
      const docLink = page.getByRole("link", { name: "Documenten" }).first();
      await docLink.click();
      await page.waitForURL(/\/portal\/documenten/, { timeout: 20000 });
      await page.waitForTimeout(1500);
      const afterDocSoft = await snap("doc_after_soft_before_f5", context, page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const afterDocF5 = await snap("doc_after_f5", context, page);
      documenten = {
        beforeSoft: beforeDoc,
        afterSoft: afterDocSoft,
        afterF5: afterDocF5,
        finalUrl: page.url(),
        pass: !page.url().includes("/inloggen"),
      };
      console.log(JSON.stringify({ type: "documenten", documenten }));
    }
  } catch (err) {
    documenten = {
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    };
  }

  const report = {
    realBrowser: version,
    outDir: OUT_DIR,
    snapshots,
    probePass,
    projectenFinalUrl: afterF5Url,
    projectenReloadPass: !afterF5Url.includes("/inloggen"),
    softSetCookies,
    cookieKillers,
    f5DocReq,
    f5ExtraInfo: f5Extra,
    softNavNetwork: softEvents.filter(
      (e) =>
        e.url?.includes("/uitloggen") ||
        e.setCookieSafe?.length ||
        e.cookieNamesSent?.length ||
        e.associatedCookies?.length ||
        (e.responseHeadersSafe &&
          Object.keys(e.responseHeadersSafe).some((k) =>
            k.includes("set-cookie") || k.startsWith("x-vdb") || k === "location",
          )),
    ),
    documenten,
    allNetCount: net.length,
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ type: "forensics_done", reportPath: REPORT }));

  // Keep browser open briefly so human can see end state
  await page.waitForTimeout(3000);
  await context.close();
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      type: "forensics_error",
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
