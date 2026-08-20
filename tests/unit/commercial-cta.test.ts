import { describe, expect, it } from "vitest";
import {
  commercialCtaLabel,
  commercialPackageCtaHref,
  resolveCommercialCtaKind,
} from "@/lib/commerce/commercial-cta";

describe("commercial-cta", () => {
  it("uses Bestellen for sellable one-time packages", () => {
    const kind = resolveCommercialCtaKind({ quoteOnly: false });
    expect(kind).toBe("order");
    expect(commercialCtaLabel(kind, "nl")).toBe("Bestellen");
    expect(commercialPackageCtaHref({ slug: "launch-website", kind })).toContain(
      "intent=order",
    );
  });

  it("uses Abonneren for recurring sellable care", () => {
    const kind = resolveCommercialCtaKind({ quoteOnly: false, monthly: true });
    expect(kind).toBe("subscribe");
    expect(commercialCtaLabel(kind, "nl")).toBe("Abonneren");
  });

  it("uses Configureer aanvraag for quote-only custom work", () => {
    const kind = resolveCommercialCtaKind({ quoteOnly: true });
    expect(kind).toBe("configure");
    expect(commercialCtaLabel(kind, "nl")).toBe("Configureer aanvraag");
    expect(commercialPackageCtaHref({ slug: "custom-website", kind })).toContain(
      "intent=configure",
    );
  });
});
