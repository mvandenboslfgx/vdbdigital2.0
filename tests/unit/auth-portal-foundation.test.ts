import { describe, expect, it } from "vitest";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import {
  audienceSafeInternalPath,
  isSafeInternalPath,
} from "@/lib/security/redirect";
import { existsSync, readFileSync } from "node:fs";

describe("Auth portal foundation — redirects", () => {
  it("blocks open redirects", () => {
    expect(isSafeInternalPath("https://evil.example")).toBe(false);
    expect(isSafeInternalPath("//evil.example")).toBe(false);
    expect(isSafeInternalPath("/admin")).toBe(true);
    expect(isSafeInternalPath("/portal")).toBe(true);
  });

  it("keeps staff out of portal next and customers out of admin next", () => {
    expect(audienceSafeInternalPath("/portal", "staff", "/admin")).toBe("/admin");
    expect(
      audienceSafeInternalPath("/admin/customers", "staff", "/admin"),
    ).toBe("/admin/customers");
    expect(audienceSafeInternalPath("/admin", "customer", "/portal")).toBe(
      "/portal",
    );
    expect(
      audienceSafeInternalPath("/portal/profiel", "customer", "/portal"),
    ).toBe("/portal/profiel");
  });
});

describe("Auth portal foundation — customer org roles", () => {
  it("VIEW_ONLY cannot mutate quotes or support", () => {
    expect(hasCustomerPermission("VIEW_ONLY", "portal.quotes.respond")).toBe(
      false,
    );
    expect(hasCustomerPermission("VIEW_ONLY", "portal.support.create")).toBe(
      false,
    );
    expect(hasCustomerPermission("VIEW_ONLY", "portal.access")).toBe(true);
  });

  it("PRIMARY and MEMBER can accept quotes; BILLING views only", () => {
    expect(hasCustomerPermission("PRIMARY", "portal.support.create")).toBe(true);
    expect(hasCustomerPermission("MEMBER", "portal.support.reply")).toBe(true);
    expect(hasCustomerPermission("PRIMARY", "portal.quotes.accept")).toBe(true);
    expect(hasCustomerPermission("MEMBER", "portal.quotes.decline")).toBe(true);
    expect(hasCustomerPermission("BILLING", "portal.quotes.view")).toBe(true);
    expect(hasCustomerPermission("BILLING", "portal.quotes.accept")).toBe(false);
    expect(hasCustomerPermission("BILLING", "portal.quotes.respond")).toBe(false);
    expect(hasCustomerPermission("BILLING", "portal.support.create")).toBe(false);
  });
});

describe("Auth portal foundation — login copy + routes", () => {
  it("uses generic non-enumerating login error", () => {
    const src = readFileSync("src/server/actions/auth-actions.ts", "utf8");
    expect(src).toContain(
      "Inloggen is niet gelukt. Controleer je gegevens en probeer het opnieuw.",
    );
  });

  it("ships canonical Dutch auth routes", () => {
    for (const path of [
      "src/app/(auth)/inloggen/page.tsx",
      "src/app/(auth)/wachtwoord-vergeten/page.tsx",
      "src/app/(auth)/wachtwoord-herstellen/page.tsx",
      "src/app/(auth)/uitnodiging/accepteren/page.tsx",
      "src/app/(auth)/uitloggen/route.ts",
      "src/app/auth/callback/route.ts",
      "src/app/admin/(protected)/organizations/page.tsx",
      "src/app/admin/(protected)/customers/new/page.tsx",
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });

  it("does not reintroduce Tawk", () => {
    expect(existsSync("src/app/api/tawk")).toBe(false);
    expect(existsSync("src/config/tawk.ts")).toBe(false);
  });
});
