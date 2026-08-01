import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { siteConfig } from "@/config/site";

describe("header polish contracts", () => {
  const header = fs.readFileSync(
    path.join(process.cwd(), "src/components/navigation/header.tsx"),
    "utf8",
  );
  const serverNav = fs.readFileSync(
    path.join(process.cwd(), "src/components/navigation/header-server-nav.tsx"),
    "utf8",
  );
  const switcher = fs.readFileSync(
    path.join(process.cwd(), "src/i18n/server-language-switcher.tsx"),
    "utf8",
  );
  const hero = fs.readFileSync(
    path.join(process.cwd(), "src/components/sections/hero-section.tsx"),
    "utf8",
  );
  const globals = fs.readFileSync(
    path.join(process.cwd(), "src/styles/globals.css"),
    "utf8",
  );

  it("keeps company links in a dropdown config, not flat main nav", () => {
    expect(siteConfig.navigation.main.map((i) => i.labelKey)).toEqual([
      "nav.solutions",
      "nav.packages",
      "nav.shop",
      "nav.cases",
      "nav.process",
    ]);
    expect(siteConfig.navigation.company.map((i) => i.labelKey)).toEqual([
      "nav.about",
      "nav.support",
    ]);
    expect(header).toContain("HeaderCompanyNavServer");
    expect(header).toContain('data-testid="desktop-nav"');
  });

  it("uses a single desktop primary CTA and earlier mobile breakpoint", () => {
    expect(header).toContain('data-testid="header-primary-cta"');
    expect(header).toContain("xl:inline-flex");
    expect(serverNav).toContain("xl:hidden");
    expect(header).toContain("xl:flex");
    // Quote CTA remains in drawer only — not a second desktop header CTA
    expect(header).not.toMatch(
      /href=\{paths\.quote\}[\s\S]{0,200}?hidden xl:inline-flex/,
    );
    expect(serverNav).toMatch(/href=\{paths\.quote\}/);
    expect(header).toContain("text-nowrap-safe");
    expect(header).toContain("shrink-0");
  });

  it("keeps language switcher horizontal and compact in header", () => {
    expect(switcher).toContain("flex-nowrap");
    expect(switcher).toContain("compact");
    expect(switcher).not.toContain("min-w-11");
    expect(header).toContain("LanguageSwitcherBoundary");
  });

  it("removes the dual hero logo", () => {
    expect(hero).not.toContain("VdbLogo");
    expect(hero).not.toContain('lockup="stacked"');
  });

  it("uses champagne primary tokens instead of blue", () => {
    expect(globals).toContain("--primary: #dcc59a");
    expect(globals).not.toMatch(/--primary:\s*#4e73ff/i);
    expect(globals).toContain("text-nowrap-safe");
  });
});
