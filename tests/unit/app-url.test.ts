import { afterEach, describe, expect, it } from "vitest";
import {
  isLocalhostUrl,
  isPreviewDeployment,
  resolveAppUrl,
} from "@/lib/url/app-url";

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe("resolveAppUrl", () => {
  it("uses localhost when no env is set", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(resolveAppUrl()).toBe("http://localhost:3000");
  });

  it("uses VERCEL_URL with HTTPS on preview", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "vdbdigital-git-main-preview.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(resolveAppUrl()).toBe("https://vdbdigital-git-main-preview.vercel.app");
  });

  it("never uses localhost for preview webhooks when VERCEL_URL is set", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "preview.example.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const url = resolveAppUrl();
    expect(url).not.toContain("localhost");
    expect(url.startsWith("https://")).toBe(true);
  });

  it("uses production NEXT_PUBLIC_APP_URL when not localhost", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.vdbdigital.nl";
    expect(resolveAppUrl()).toBe("https://www.vdbdigital.nl");
  });

  it("rejects trusting localhost in production deployment", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "vdbdigital.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(resolveAppUrl()).toBe("https://vdbdigital.vercel.app");
  });
});

describe("isLocalhostUrl", () => {
  it("detects localhost variants", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostUrl("https://www.vdbdigital.nl")).toBe(false);
  });
});

describe("isPreviewDeployment", () => {
  it("detects preview deployments", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    expect(isPreviewDeployment()).toBe(true);
  });
});
