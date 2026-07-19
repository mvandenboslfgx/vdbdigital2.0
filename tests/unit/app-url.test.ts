import { afterEach, describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  assertProductionAppUrl,
  evaluateProductionAppUrl,
  isLocalhostUrl,
  isPreviewDeployment,
  resolveAppUrl,
  resolvePublicSiteUrl,
} from "@/lib/url/app-url";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

function clearVercel() {
  delete process.env.VERCEL;
  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_ENV;
}

describe("evaluateProductionAppUrl / assertProductionAppUrl", () => {
  it("allows exact apex", () => {
    const r = evaluateProductionAppUrl("https://vdbdigital.nl");
    expect(r).toEqual({ ok: true, origin: CANONICAL_PRODUCTION_ORIGIN });
    expect(assertProductionAppUrl("https://vdbdigital.nl/")).toBe(
      CANONICAL_PRODUCTION_ORIGIN,
    );
  });

  it("fails when missing", () => {
    expect(evaluateProductionAppUrl(undefined).ok).toBe(false);
    expect(evaluateProductionAppUrl("").ok).toBe(false);
    expect(() => assertProductionAppUrl(undefined)).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("fails localhost", () => {
    expect(evaluateProductionAppUrl("http://localhost:3000").ok).toBe(false);
  });

  it("fails www", () => {
    expect(evaluateProductionAppUrl("https://www.vdbdigital.nl").ok).toBe(
      false,
    );
  });

  it("fails http apex", () => {
    expect(evaluateProductionAppUrl("http://vdbdigital.nl").ok).toBe(false);
  });

  it("fails vercel preview host", () => {
    expect(
      evaluateProductionAppUrl("https://vdbdigital-git-main.vercel.app").ok,
    ).toBe(false);
  });

  it("fails query or fragment", () => {
    expect(
      evaluateProductionAppUrl("https://vdbdigital.nl?x=1").ok,
    ).toBe(false);
    expect(
      evaluateProductionAppUrl("https://vdbdigital.nl#frag").ok,
    ).toBe(false);
  });
});

describe("resolveAppUrl", () => {
  it("uses localhost when no env is set", () => {
    clearVercel();
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(resolveAppUrl()).toBe("http://localhost:3000");
  });

  it("uses VERCEL_URL with HTTPS on preview when APP_URL is localhost", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "vdbdigital-git-main-preview.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(resolveAppUrl()).toBe(
      "https://vdbdigital-git-main-preview.vercel.app",
    );
  });

  it("prefers explicit non-localhost APP_URL on preview", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "preview.example.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    expect(resolveAppUrl()).toBe("https://vdbdigital.nl");
  });

  it("production + apex → allowed", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "should-not-be-used.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    expect(resolveAppUrl()).toBe("https://vdbdigital.nl");
    expect(resolvePublicSiteUrl()).toBe("https://vdbdigital.nl");
  });

  it("production + missing APP_URL → fail (no VERCEL_URL rescue)", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "vdbdigital.vercel.app";
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(() => resolveAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("production + localhost → fail (no VERCEL_URL rescue)", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "vdbdigital.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(() => resolveAppUrl()).toThrow(/localhost|NEXT_PUBLIC_APP_URL/);
  });

  it("production + www → fail", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.vdbdigital.nl";
    expect(() => resolveAppUrl()).toThrow(/apex|www|NEXT_PUBLIC_APP_URL/);
  });
});

describe("Auth redirect contract (production apex)", () => {
  it("builds magic-link, reset and invite paths on apex", async () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    const base = resolveAppUrl();
    expect(`${base}/auth/callback?next=/portal`).toBe(
      "https://vdbdigital.nl/auth/callback?next=/portal",
    );
    expect(`${base}/wachtwoord-herstellen`).toBe(
      "https://vdbdigital.nl/wachtwoord-herstellen",
    );
    expect(`${base}/uitnodiging/accepteren?token=x`).toBe(
      "https://vdbdigital.nl/uitnodiging/accepteren?token=x",
    );
  });

  it("auth source does not hardcode foreign portfolio domains", async () => {
    const fs = await import("node:fs");
    const auth = fs.readFileSync("src/server/actions/auth-actions.ts", "utf8");
    const portal = fs.readFileSync(
      "src/server/repositories/admin-portal.ts",
      "utf8",
    );
    const foreignA = ["grill", "gasten"].join("");
    const foreignB = ["trust", "booker"].join("");
    for (const src of [auth, portal]) {
      expect(src.toLowerCase()).not.toContain(foreignA);
      expect(src.toLowerCase()).not.toContain(foreignB);
      expect(src).not.toContain("www.vdbdigital.nl");
    }
  });
});

describe("SEO / docs contract", () => {
  it("site config exposes canonical production origin constant", async () => {
    clearVercel();
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    const { siteConfig } = await import("@/config/site");
    expect(siteConfig.canonicalProductionOrigin).toBe(
      CANONICAL_PRODUCTION_ORIGIN,
    );
  });

  it("Mollie production webhook docs use apex, not www", async () => {
    const fs = await import("node:fs");
    const doc = fs.readFileSync("docs/MOLLIE_SETUP.md", "utf8");
    expect(doc).toContain("https://vdbdigital.nl/api/webhooks/mollie");
    expect(doc).not.toContain(
      "https://www.vdbdigital.nl/api/webhooks/mollie",
    );
  });

  it("checkout remains fail-closed and no-tawk remains in package scripts", async () => {
    const fs = await import("node:fs");
    const { isDirectCheckoutEnabled } = await import("@/config/features");
    delete process.env.CHECKOUT_ENABLED;
    expect(isDirectCheckoutEnabled()).toBe(false);
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.scripts["catalog:verify-no-tawk"]).toBeTruthy();
  });
});

describe("isLocalhostUrl / isPreviewDeployment", () => {
  it("detects localhost variants", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostUrl("https://www.vdbdigital.nl")).toBe(false);
  });

  it("detects preview deployments", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    expect(isPreviewDeployment()).toBe(true);
  });
});
