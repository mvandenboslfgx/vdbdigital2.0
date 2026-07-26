import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("Hero CTA structure", () => {
  it("renders one primary and one secondary CTA button", () => {
    const src = readFileSync("src/components/sections/hero-section.tsx", "utf8");

    expect(src).toContain("ServerLocaleLinkButton");
    expect(src).toContain("${paths.contact}?intent=introduction");
    expect(src).toContain("href={paths.quote}");
    expect(src).toContain('variant="outline"');
    expect(src).toContain('t("home.ctaIntro")');
    expect(src).toContain('t("home.ctaQuote")');

    const buttonBlocks =
      src.match(/<ServerLocaleLinkButton[\s\S]*?<\/ServerLocaleLinkButton>/g) ??
      [];
    expect(buttonBlocks.length).toBe(2);
  });
});
