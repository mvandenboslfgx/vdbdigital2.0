import { describe, expect, it } from "vitest";
import {
  createNotificationLocaleEvent,
  parseNotificationLocaleEvent,
} from "@/lib/notifications/locale-event";

describe("notification locale event contract", () => {
  it("adds the explicit English fallback for producers", () => {
    const event = createNotificationLocaleEvent({
      eventType: "customer.quote",
      templateVersion: "web-customer-v1",
      recipientLocale: "nl",
      localeSource: "form",
      data: { templateArgument: "Voorbeeld" },
    });

    expect(event.fallbackLocale).toBe("en");
    expect(event.recipientLocale).toBe("nl");
  });

  it("rejects unsupported recipient locales", () => {
    expect(() =>
      parseNotificationLocaleEvent({
        eventType: "customer.quote",
        templateVersion: "web-customer-v1",
        recipientLocale: "de",
        localeSource: "form",
        data: {},
        fallbackLocale: "en",
      }),
    ).toThrow();
  });

  it("rejects a non-English fallback", () => {
    expect(() =>
      parseNotificationLocaleEvent({
        eventType: "customer.quote",
        templateVersion: "web-customer-v1",
        recipientLocale: "nl",
        localeSource: "form",
        data: {},
        fallbackLocale: "nl",
      }),
    ).toThrow();
  });
});
