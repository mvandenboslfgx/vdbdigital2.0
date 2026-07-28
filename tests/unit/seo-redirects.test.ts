import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { legacyRedirects, paths, withLocale } from "@/i18n/config";

describe("SEO-001 legacy solution alias redirects", () => {
  it("maps hyphenated aliases to canonical solution paths", () => {
    expect(legacyRedirects["/solutions/live-chat"]).toBe(paths.livechat);
    expect(legacyRedirects["/solutions/review-flows"]).toBe(paths.reviewflows);
    expect(legacyRedirects["/solutions/custom-websites"]).toBe(paths.websites);
  });

  it("preserves locale prefix targets for Dutch visitors", () => {
    expect(withLocale(legacyRedirects["/solutions/live-chat"], "nl")).toBe(
      "/nl/solutions/livechat",
    );
    expect(withLocale(legacyRedirects["/solutions/review-flows"], "nl")).toBe(
      "/nl/solutions/reviewflows",
    );
    expect(withLocale(legacyRedirects["/solutions/custom-websites"], "nl")).toBe(
      "/nl/solutions/websites",
    );
  });

  it("alias route pages permanentRedirect to canonical targets", () => {
    const liveChat = readFileSync(
      "src/app/(marketing)/solutions/live-chat/page.tsx",
      "utf8",
    );
    const reviewFlows = readFileSync(
      "src/app/(marketing)/solutions/review-flows/page.tsx",
      "utf8",
    );
    const customWebsites = readFileSync(
      "src/app/(marketing)/solutions/custom-websites/page.tsx",
      "utf8",
    );

    expect(liveChat).toContain("permanentRedirect");
    expect(liveChat).toContain("paths.livechat");
    expect(reviewFlows).toContain("permanentRedirect");
    expect(reviewFlows).toContain("paths.reviewflows");
    expect(customWebsites).toContain("permanentRedirect");
    expect(customWebsites).toContain("paths.websites");
  });

  it("middleware resolves legacy aliases via legacyRedirects map", () => {
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain("legacyRedirects");
    expect(middleware).toContain("resolveLegacyTarget");
    expect(middleware).toContain("308");
  });
});
