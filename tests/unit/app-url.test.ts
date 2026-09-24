import { afterEach, describe, expect, it } from "vitest";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  assertProductionAppUrl,
  evaluateProductionAppUrl,
  getDeploymentEnvironment,
  isCloudflarePreviewHost,
  isLocalhostUrl,
  isPreviewDeployment,
  resolveAppUrl,
  resolvePublicSiteUrl,
} from "@/lib/url/app-url";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

function clearDeployment() {
  delete process.env.VDB_DEPLOYMENT_ENV;
  delete process.env.NEXT_PUBLIC_APP_URL;
}

describe("evaluateProductionAppUrl / assertProductionAppUrl", () => {
  it("allows exact apex", () => {
    const r = evaluateProductionAppUrl("https://vdbdigital.nl");
    expect(r).toEqual({ ok: true, origin: CANONICAL_PRODUCTION_ORIGIN });
    expect(assertProductionAppUrl("https://vdbdigital.nl/")).toBe(
      CANONICAL_PRODUCTION_ORIGIN,
    );
  });

  it("fails missing, localhost, www and HTTP", () => {
    expect(evaluateProductionAppUrl(undefined).ok).toBe(false);
    expect(evaluateProductionAppUrl("http://localhost:3000").ok).toBe(false);
    expect(evaluateProductionAppUrl("https://www.vdbdigital.nl").ok).toBe(false);
    expect(evaluateProductionAppUrl("http://vdbdigital.nl").ok).toBe(false);
  });

  it("rejects hosted preview origins", () => {
    expect(
      evaluateProductionAppUrl("https://preview-vdb.workers.dev").ok,
    ).toBe(false);
    expect(
      evaluateProductionAppUrl("https://vdbdigital-git-main.vercel.app").ok,
    ).toBe(false);
  });

  it("fails query or fragment", () => {
    expect(evaluateProductionAppUrl("https://vdbdigital.nl?x=1").ok).toBe(false);
    expect(evaluateProductionAppUrl("https://vdbdigital.nl#frag").ok).toBe(false);
  });
});

describe("Cloudflare deployment resolution", () => {
  it("uses localhost when no runtime env is set", () => {
    clearDeployment();
    process.env.NODE_ENV = "development";
    expect(resolveAppUrl()).toBe("http://localhost:3000");
  });

  it("uses the explicit Cloudflare preview origin", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "preview";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-vdb.workers.dev";
    expect(resolveAppUrl()).toBe("https://preview-vdb.workers.dev");
    expect(isPreviewDeployment()).toBe(true);
  });

  it("fails closed when a preview has localhost configured", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "preview";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(() => resolveAppUrl()).toThrow(/preview origin/i);
  });

  it("allows only the canonical apex in production", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    expect(resolveAppUrl()).toBe("https://vdbdigital.nl");
    expect(resolvePublicSiteUrl()).toBe("https://vdbdigital.nl");
  });

  it("production without a safe APP_URL fails closed", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(() => resolveAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("detects environment from Cloudflare preview URL as a fallback", () => {
    delete process.env.VDB_DEPLOYMENT_ENV;
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-vdb.workers.dev";
    expect(getDeploymentEnvironment()).toBe("preview");
    expect(isCloudflarePreviewHost("preview-vdb.workers.dev")).toBe(true);
  });
});

describe("Auth redirect contract", () => {
  it("builds auth paths on the production apex", () => {
    process.env.NODE_ENV = "production";
    process.env.VDB_DEPLOYMENT_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://vdbdigital.nl";
    const base = resolveAppUrl();
    expect(`${base}/auth/callback?next=/portal`).toBe(
      "https://vdbdigital.nl/auth/callback?next=/portal",
    );
    expect(`${base}/wachtwoord-herstellen`).toBe(
      "https://vdbdigital.nl/wachtwoord-herstellen",
    );
  });
});

describe("isLocalhostUrl", () => {
  it("detects localhost variants", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostUrl("https://www.vdbdigital.nl")).toBe(false);
  });
});
