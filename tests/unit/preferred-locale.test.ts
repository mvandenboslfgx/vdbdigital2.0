import { describe, it, expect } from "vitest";
import {
  parsePreferredLocale,
  resolvePreferredLocale,
} from "@/i18n/preference";
import {
  parseLocaleChoice,
  resolveLoginLocaleSync,
  serializeLocaleChoice,
  shouldClearChoiceOnLogout,
} from "@/i18n/locale-choice";

describe("preferred_locale parsing", () => {
  it("accepts the supported locales in any casing or padding", () => {
    expect(parsePreferredLocale("nl")).toBe("nl");
    expect(parsePreferredLocale("EN")).toBe("en");
    expect(parsePreferredLocale("  nl  ")).toBe("nl");
  });

  it("returns null for null, empty and unsupported DB values", () => {
    expect(parsePreferredLocale(null)).toBeNull();
    expect(parsePreferredLocale(undefined)).toBeNull();
    expect(parsePreferredLocale("")).toBeNull();
    expect(parsePreferredLocale("de")).toBeNull();
    expect(parsePreferredLocale("nl-NL")).toBeNull();
    expect(parsePreferredLocale("../../etc/passwd")).toBeNull();
  });
});

describe("locale preference order (ADR-001)", () => {
  it("puts the account preference above every other signal", () => {
    const resolved = resolvePreferredLocale({
      accountLocale: "nl",
      cookieLocale: "en",
      urlLocale: "en",
      acceptLanguage: "en-GB,en;q=0.9",
      allowAcceptLanguage: true,
    });
    expect(resolved).toEqual({ locale: "nl", source: "account" });
  });

  it("puts an explicit cookie above URL context and detection", () => {
    const resolved = resolvePreferredLocale({
      accountLocale: null,
      cookieLocale: "nl",
      urlLocale: "en",
      acceptLanguage: "en-GB",
      allowAcceptLanguage: true,
    });
    expect(resolved).toEqual({ locale: "nl", source: "cookie" });
  });

  it("falls back to URL context when there is no account or cookie", () => {
    const resolved = resolvePreferredLocale({
      urlLocale: "nl",
      acceptLanguage: "en-GB",
      allowAcceptLanguage: true,
    });
    expect(resolved).toEqual({ locale: "nl", source: "url" });
  });

  it("only uses Accept-Language when the caller marks it eligible", () => {
    expect(
      resolvePreferredLocale({
        acceptLanguage: "nl-NL,nl;q=0.9,en;q=0.8",
        allowAcceptLanguage: true,
      }),
    ).toEqual({ locale: "nl", source: "accept-language" });

    expect(
      resolvePreferredLocale({
        acceptLanguage: "nl-NL,nl;q=0.9",
        allowAcceptLanguage: false,
      }),
    ).toEqual({ locale: "en", source: "default" });
  });

  it("ignores an invalid or missing account value instead of guessing", () => {
    expect(
      resolvePreferredLocale({ accountLocale: "de", cookieLocale: "nl" }),
    ).toEqual({ locale: "nl", source: "cookie" });

    expect(resolvePreferredLocale({ accountLocale: null })).toEqual({
      locale: "en",
      source: "default",
    });
  });
});

describe("locale choice cookie", () => {
  it("round-trips a choice", () => {
    const raw = serializeLocaleChoice({ source: "user", locale: "nl" });
    expect(raw).toBe("user:nl");
    expect(parseLocaleChoice(raw)).toEqual({ source: "user", locale: "nl" });
  });

  it("rejects unknown sources and locales", () => {
    expect(parseLocaleChoice("admin:nl")).toBeNull();
    expect(parseLocaleChoice("user:de")).toBeNull();
    expect(parseLocaleChoice("nl")).toBeNull();
    expect(parseLocaleChoice(null)).toBeNull();
  });
});

describe("login locale sync", () => {
  it("uses the account preference and never rewrites it", () => {
    const sync = resolveLoginLocaleSync({
      accountLocale: "nl",
      choiceCookie: "user:en",
      requestLocale: "en",
    });
    expect(sync.locale).toBe("nl");
    expect(sync.persistToAccount).toBeNull();
    expect(sync.cookieChoice).toEqual({ source: "account", locale: "nl" });
  });

  it("adopts a guest's explicit choice when the account has none", () => {
    const sync = resolveLoginLocaleSync({
      accountLocale: null,
      choiceCookie: "user:nl",
      requestLocale: "en",
    });
    expect(sync.locale).toBe("nl");
    expect(sync.persistToAccount).toBe("nl");
  });

  it("does not adopt a locale that was only inherited from a previous account", () => {
    const sync = resolveLoginLocaleSync({
      accountLocale: null,
      choiceCookie: "account:nl",
      requestLocale: "en",
    });
    expect(sync.locale).toBe("en");
    expect(sync.persistToAccount).toBeNull();
    expect(sync.cookieChoice).toBeNull();
  });

  it("keeps the request locale when nothing explicit exists", () => {
    const sync = resolveLoginLocaleSync({
      accountLocale: null,
      choiceCookie: null,
      requestLocale: "nl",
    });
    expect(sync.locale).toBe("nl");
    expect(sync.persistToAccount).toBeNull();
  });

  it("ignores an invalid DB value rather than failing the sign-in", () => {
    const sync = resolveLoginLocaleSync({
      accountLocale: "fr",
      choiceCookie: null,
      requestLocale: "en",
    });
    expect(sync.locale).toBe("en");
  });

  it("gives two accounts on one device their own preference", () => {
    // Account A signs in: preference nl, so the device now carries account:nl.
    const first = resolveLoginLocaleSync({
      accountLocale: "nl",
      choiceCookie: null,
      requestLocale: "en",
    });
    expect(first.locale).toBe("nl");
    const afterFirst = serializeLocaleChoice(first.cookieChoice!);

    // Signing out drops the account-derived marker.
    expect(shouldClearChoiceOnLogout(afterFirst)).toBe(true);

    // Account B signs in on the same device and gets its own preference,
    // not account A's leftover nl.
    const second = resolveLoginLocaleSync({
      accountLocale: "en",
      choiceCookie: null,
      requestLocale: "nl",
    });
    expect(second.locale).toBe("en");
  });

  it("keeps a visitor's own choice across sign-out", () => {
    expect(shouldClearChoiceOnLogout("user:nl")).toBe(false);
    expect(shouldClearChoiceOnLogout(null)).toBe(false);
  });
});
