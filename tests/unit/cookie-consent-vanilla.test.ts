import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("vanilla cookie consent contracts", () => {
  const script = readFileSync(
    resolve("public/scripts/vdb-consent.js"),
    "utf8",
  );
  const banner = readFileSync(
    resolve("src/components/consent/cookie-banner-server.tsx"),
    "utf8",
  );
  const layout = readFileSync(
    resolve("src/components/layout/marketing-layout.tsx"),
    "utf8",
  );
  const footerBtn = readFileSync(
    resolve("src/components/layout/footer-cookie-preferences-button.tsx"),
    "utf8",
  );

  it("stores consent under vdb_consent and supports accept/reject/save", () => {
    expect(script).toContain('KEY = "vdb_consent"');
    expect(script).toContain('data-vdb-consent");');
    expect(script).toContain('action === "accept"');
    expect(script).toContain('action === "reject"');
    expect(script).toContain('action === "save"');
    expect(script).toContain("localStorage.setItem");
  });

  it("keeps banner hidden until idle reveal and never uses next/script", () => {
    expect(banner).toContain('id="vdb-cookie-banner"');
    expect(banner).toContain("hidden");
    expect(banner).toContain('src="/scripts/vdb-consent.js"');
    expect(banner).toContain("defer");
    expect(banner).not.toMatch(/from ["']next\/script["']/);
    expect(banner).not.toMatch(/import Script from/);
    expect(layout).toContain("CookieBannerServer");
  });

  it("opens preferences without React ConsentProvider around marketing footer", () => {
    expect(footerBtn).toContain("data-vdb-open-consent");
    expect(footerBtn).not.toContain("use client");
    expect(footerBtn).not.toContain("useConsent");
    expect(script).toContain("vdb:open-consent");
    expect(layout).not.toContain("ConsentProvider");
  });
});
