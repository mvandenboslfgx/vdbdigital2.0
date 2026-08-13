import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

/**
 * SEO: private/personalized routes must never be crawlable, in either
 * locale. Verifies robots.ts against the actual bare-index-route shape of
 * /admin, /portal, /checkout, /cart (all are route-group index pages with
 * no trailing path segment — see src/i18n/config.ts `paths`).
 */
describe("robots.ts private route disallow coverage", () => {
  const result = robots();
  const disallow = Array.isArray(result.rules)
    ? result.rules.flatMap((r) => r.disallow ?? [])
    : ([] as string[]).concat(result.rules.disallow ?? []);

  function isDisallowed(path: string): boolean {
    return disallow.some((prefix) => path.startsWith(prefix));
  }

  const privateBareRoutes = ["/admin", "/portal", "/checkout", "/cart"];

  it.each(privateBareRoutes)(
    "blocks the bare index route '%s' (no trailing slash)",
    (path) => {
      expect(isDisallowed(path)).toBe(true);
      expect(isDisallowed(`/nl${path}`)).toBe(true);
    },
  );

  it.each(privateBareRoutes)(
    "blocks subpaths under '%s' too",
    (path) => {
      expect(isDisallowed(`${path}/anything`)).toBe(true);
      expect(isDisallowed(`/nl${path}/anything`)).toBe(true);
    },
  );

  it("still allows public routes with a similar-looking prefix", () => {
    expect(isDisallowed("/")).toBe(false);
    expect(isDisallowed("/shop")).toBe(false);
    expect(isDisallowed("/nl/shop")).toBe(false);
  });

  it("blocks the auth flow routes in both locales", () => {
    for (const path of [
      "/inloggen",
      "/wachtwoord-vergeten",
      "/account-aanmaken",
      "/uitnodiging/accepteren",
      "/e-mail-bevestigen",
      "/geen-toegang",
    ]) {
      expect(isDisallowed(path)).toBe(true);
      expect(isDisallowed(`/nl${path}`)).toBe(true);
    }
  });

  it("includes a sitemap reference", () => {
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
