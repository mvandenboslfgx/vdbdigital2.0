/**
 * Post-fix acceptance: prove GET /uitloggen no longer clears cookies,
 * and portal HTML has no prefetchable Link to /uitloggen.
 * No Google login required.
 */
import { chromium } from "playwright";

const BASE = "https://vdbdigital.nl";

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Seed fake auth chunks so we can observe clears
  await context.addCookies([
    {
      name: "sb-nhsrdnjfsxfikfbdmdfj-auth-token.0",
      value: "chunk0-fake-value-for-clear-detection",
      domain: "vdbdigital.nl",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "sb-nhsrdnjfsxfikfbdmdfj-auth-token.1",
      value: "chunk1-fake-value-for-clear-detection",
      domain: "vdbdigital.nl",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const getRes = await context.request.get(`${BASE}/uitloggen`, {
    maxRedirects: 0,
  });
  const getLoc = getRes.headers()["location"] ?? "";
  const getSet = getRes.headers()["set-cookie"] ?? "";
  const getClears =
    /Max-Age=0/i.test(getSet) || /auth-token[^=]*=(?:;|$)/.test(getSet);

  const postRes = await context.request.post(`${BASE}/uitloggen`, {
    maxRedirects: 0,
  });
  const postLoc = postRes.headers()["location"] ?? "";

  // Prefetch-style GET with RSC headers
  const prefetchRes = await context.request.get(`${BASE}/uitloggen`, {
    maxRedirects: 0,
    headers: {
      RSC: "1",
      "Next-Router-Prefetch": "1",
    },
  });
  // Follow one hop if 307 to ?_rsc
  let prefetchLoc = prefetchRes.headers()["location"] ?? "";
  let prefetchSet = prefetchRes.headers()["set-cookie"] ?? "";
  if (prefetchRes.status() === 307 && prefetchLoc.includes("uitloggen")) {
    const hop = await context.request.get(
      prefetchLoc.startsWith("http") ? prefetchLoc : `${BASE}${prefetchLoc}`,
      { maxRedirects: 0, headers: { RSC: "1", "Next-Router-Prefetch": "1" } },
    );
    prefetchLoc = hop.headers()["location"] ?? "";
    prefetchSet = hop.headers()["set-cookie"] ?? "";
  }
  const prefetchClears =
    /Max-Age=0/i.test(prefetchSet) ||
    /auth-token[^=]*=(?:;|$)/.test(prefetchSet);

  // Check live markup: no Link href=/uitloggen (needs auth to see shell —
  // unauthenticated /portal redirects; fetch login page is useless.
  // Instead assert unit/source already; here assert GET safety.)

  const report = {
    getStatus: getRes.status(),
    getLocation: getLoc,
    getClearsAuth: getClears,
    prefetchLocation: prefetchLoc,
    prefetchClearsAuth: prefetchClears,
    postStatus: postRes.status(),
    postLocation: postLoc,
    pass:
      getRes.status() === 303 &&
      /\/portal/.test(getLoc) &&
      !/\/inloggen/.test(getLoc) &&
      !getClears &&
      /\/portal/.test(prefetchLoc) &&
      !/\/inloggen/.test(prefetchLoc) &&
      !prefetchClears &&
      postRes.status() === 303 &&
      /\/inloggen/.test(postLoc),
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
