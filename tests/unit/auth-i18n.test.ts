import { describe, it, expect } from "vitest";
import en from "@/i18n/messages/en";
import nl from "@/i18n/messages/nl";
import { createT } from "@/i18n/create-t";

describe("auth + errors + mfa i18n namespaces", () => {
  it("defines the same auth.* keys in en and nl", () => {
    expect(Object.keys(en.auth).sort()).toEqual(Object.keys(nl.auth).sort());
  });

  it("defines the same errors.* keys in en and nl", () => {
    expect(Object.keys(en.errors).sort()).toEqual(Object.keys(nl.errors).sort());
    expect(Object.keys(en.errors.validation).sort()).toEqual(
      Object.keys(nl.errors.validation).sort(),
    );
  });

  it("defines the same mfa.* keys in en and nl", () => {
    expect(Object.keys(en.mfa).sort()).toEqual(Object.keys(nl.mfa).sort());
  });

  it("interpolates rate limit seconds in both locales", () => {
    const tEn = createT(en);
    const tNl = createT(nl);
    expect(tEn("errors.rateLimited", { seconds: 30 })).toContain("30");
    expect(tNl("errors.rateLimited", { seconds: 30 })).toContain("30");
    expect(tEn("errors.rateLimited", { seconds: 30 })).not.toContain("{seconds}");
    expect(tNl("errors.rateLimited", { seconds: 30 })).not.toContain("{seconds}");
  });

  it("never falls back to the raw dotted key for new namespaces", () => {
    const tEn = createT(en);
    const tNl = createT(nl);
    const keys = [
      "auth.loginTitle",
      "auth.errorBlocked",
      "errors.genericLoginFailed",
      "errors.authNotConfigured",
      "errors.validation.emailRequired",
      "mfa.errorEnrollFailed",
      "mfa.errorVerifyFailed",
    ];
    for (const key of keys) {
      expect(tEn(key)).not.toBe(key);
      expect(tNl(key)).not.toBe(key);
    }
  });

  it("keeps Dutch professional (non-literal) for the generic login error", () => {
    // Anti-enumeration copy should read as natural Dutch, not a machine-translated key.
    expect(nl.errors.genericLoginFailed).toMatch(/inloggen/i);
    expect(nl.errors.genericLoginFailed).not.toBe(en.errors.genericLoginFailed);
  });
});
