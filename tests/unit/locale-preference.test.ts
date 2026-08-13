import { describe, it, expect } from "vitest";
import { resolvePreferredLocale, parsePreferredLocale } from "@/i18n/preference";
import { parseNotificationLocaleEvent } from "@/lib/notifications/locale-event";

describe("locale preference order", () => {
  it("prefers account over cookie/url/accept-language", () => {
    const r = resolvePreferredLocale({
      accountLocale: "en",
      cookieLocale: "nl",
      urlLocale: "nl",
      acceptLanguage: "nl-NL",
      allowAcceptLanguage: true,
    });
    expect(r).toEqual({ locale: "en", source: "account" });
  });

  it("prefers cookie over url when account unset", () => {
    const r = resolvePreferredLocale({
      cookieLocale: "nl",
      urlLocale: "en",
    });
    expect(r).toEqual({ locale: "nl", source: "cookie" });
  });

  it("rejects unknown locales", () => {
    expect(parsePreferredLocale("de")).toBeNull();
    expect(parsePreferredLocale("en-US")).toBeNull();
    expect(parsePreferredLocale("en")).toBe("en");
  });

  it("falls back to English", () => {
    expect(resolvePreferredLocale({})).toEqual({
      locale: "en",
      source: "default",
    });
  });
});

describe("notification locale event contract", () => {
  it("parses a valid event", () => {
    const event = parseNotificationLocaleEvent({
      eventType: "contact.received",
      templateVersion: "2026.08.01",
      recipientLocale: "nl",
      localeSource: "form",
      data: { name: "Ada" },
    });
    expect(event.fallbackLocale).toBe("en");
    expect(event.recipientLocale).toBe("nl");
  });

  it("rejects unsupported recipient locales", () => {
    expect(() =>
      parseNotificationLocaleEvent({
        eventType: "x",
        templateVersion: "1",
        recipientLocale: "de",
        localeSource: "default",
      }),
    ).toThrow();
  });
});
