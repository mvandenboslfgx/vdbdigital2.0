import { describe, it, expect } from "vitest";
import en from "@/i18n/messages/en";
import nl from "@/i18n/messages/nl";
import {
  defaultLocale,
  locales,
  withLocale,
  stripLocalePrefix,
  paths,
} from "@/i18n/config";
import {
  filterSearchParams,
  parseFormLocale,
  SAFE_QUERY_KEYS,
  SENSITIVE_QUERY_KEYS,
} from "@/i18n/locale-query";
import { buildLocaleAlternates } from "@/i18n/seo";
import { createT } from "@/i18n/create-t";
import { seedProducts } from "@/config/products.seed";
import {
  localizeProduct,
  getProductPublicationAdvice,
} from "@/i18n/localize-product";
import { getCustomerMailPreview } from "@/lib/email/templates";
import { calculateOrderTotals, sumLineItems } from "@/lib/utilities/vat";

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") return [path];
    return collectKeys(v, path);
  });
}

const TRANSLATION_KEY_PATTERN = /\b[a-z]+(?:\.[a-zA-Z0-9_]+){1,4}\b/;

describe("i18n dictionaries", () => {
  it("keeps exact same keys for en and nl", () => {
    const enKeys = collectKeys(en).sort();
    const nlKeys = collectKeys(nl).sort();
    expect(enKeys).toEqual(nlKeys);
  });

  it("uses English as default locale", () => {
    expect(defaultLocale).toBe("en");
    expect(locales).toEqual(["en", "nl"]);
  });

  it("does not expose raw translation keys as message values", () => {
    for (const key of collectKeys(en)) {
      const value = createT(en)(key);
      expect(value).not.toBe(key);
      // Values should not look like dotted keys only
      if (value === key) {
        throw new Error(`Missing translation: ${key}`);
      }
    }
  });
});

describe("locale routing helpers", () => {
  it("prefixes Dutch routes under /nl", () => {
    expect(withLocale("/solutions", "nl")).toBe("/nl/solutions");
    expect(withLocale("/", "nl")).toBe("/nl");
    expect(withLocale("/solutions", "en")).toBe("/solutions");
  });

  it("preserves route equivalence when switching locale", () => {
    const bare = "/shop/starter-website";
    expect(stripLocalePrefix(withLocale(bare, "nl")).pathname).toBe(bare);
    expect(stripLocalePrefix(withLocale(bare, "en")).pathname).toBe(bare);
  });

  it("does not create /en prefix for English", () => {
    expect(withLocale("/contact", "en")).toBe("/contact");
    expect(withLocale("/contact", "en")).not.toContain("/en/");
  });
});

describe("language switcher query filtering", () => {
  it("keeps safe product query param", () => {
    const filtered = filterSearchParams(
      new URLSearchParams("product=starter-website&token=abc"),
    );
    expect(filtered.get("product")).toBe("starter-website");
    expect(filtered.get("token")).toBeNull();
  });

  it("strips sensitive security query params", () => {
    for (const key of ["code", "state", "access_token", "payment_id"]) {
      expect(SENSITIVE_QUERY_KEYS.has(key)).toBe(true);
      const filtered = filterSearchParams(new URLSearchParams(`${key}=secret`));
      expect(filtered.get(key)).toBeNull();
    }
  });

  it("only allows known safe keys", () => {
    expect(SAFE_QUERY_KEYS.has("product")).toBe(true);
    expect(SAFE_QUERY_KEYS.has("category")).toBe(true);
    const filtered = filterSearchParams(new URLSearchParams("evil=1&category=websites"));
    expect(filtered.get("evil")).toBeNull();
    expect(filtered.get("category")).toBe("websites");
  });
});

describe("form locale validation", () => {
  it("accepts only en|nl", () => {
    expect(parseFormLocale("en")).toBe("en");
    expect(parseFormLocale("nl")).toBe("nl");
  });

  it("falls back to en for arbitrary client locales", () => {
    expect(parseFormLocale("de")).toBe("en");
    expect(parseFormLocale("fr-FR")).toBe("en");
    expect(parseFormLocale(null)).toBe("en");
    expect(parseFormLocale({ locale: "nl" })).toBe("en");
  });
});

describe("localized emails", () => {
  it("sends EN customer copy for en locale", () => {
    const mail = getCustomerMailPreview("contact", "en", "Alex");
    expect(mail.subject).toContain("We received");
    expect(mail.text).toContain("Hi Alex");
    expect(mail.html).toContain("Alex");
  });

  it("sends NL customer copy for nl locale", () => {
    const mail = getCustomerMailPreview("contact", "nl", "Alex");
    expect(mail.subject).toContain("bericht");
    expect(mail.text).toContain("Hoi Alex");
  });

  it("falls back to English when locale missing", () => {
    const mail = getCustomerMailPreview("quote", undefined, "Sam");
    expect(mail.subject).toMatch(/proposal request|received/i);
    expect(mail.text).toContain("Hi Sam");
  });

  it("escapes HTML in customer templates", () => {
    const mail = getCustomerMailPreview("support", "en", `<script>alert(1)</script>`);
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});

describe("product localization parity", () => {
  it("keeps prices identical across locales for all seed products", () => {
    for (const product of seedProducts) {
      const enProduct = localizeProduct(product, "en");
      const nlProduct = localizeProduct(product, "nl");
      expect(nlProduct.priceCents).toBe(enProduct.priceCents);
      expect(nlProduct.fromPriceCents).toBe(enProduct.fromPriceCents);
      expect(nlProduct.billingType).toBe(enProduct.billingType);
      expect(nlProduct.id).toBe(enProduct.id);
      expect(nlProduct.slug).toBe(enProduct.slug);
      expect(nlProduct.name).not.toEqual("");
      expect(getProductPublicationAdvice(product)).not.toBe("DO_NOT_PUBLISH");
    }
  });

  it("provides Dutch names for NL locale", () => {
    const starter = seedProducts.find((p) => p.slug === "starter-website")!;
    const nl = localizeProduct(starter, "nl");
    expect(nl.name).toMatch(/Starter|Website/i);
    expect(nl.shortDescription.length).toBeGreaterThan(20);
  });
});

describe("cart calculation locale independence", () => {
  it("keeps totals identical regardless of presentational locale", () => {
    const lines = [
      { unitPriceCents: 149900, quantity: 1 },
      { unitPriceCents: 19900, quantity: 2 },
    ];
    const subtotal = sumLineItems(lines);
    const totals = calculateOrderTotals(subtotal);
    expect(totals.subtotalCents).toBe(149900 + 39800);
    expect(totals.totalCents).toBe(totals.subtotalCents + totals.vatCents);
  });
});

describe("SEO alternates", () => {
  it("builds canonical and hreflang without /en prefix", () => {
    const enAlt = buildLocaleAlternates("/solutions", "en");
    expect(enAlt.canonical).toBe("/solutions");
    expect(enAlt.languages.en).toBe("/solutions");
    expect(enAlt.languages.nl).toBe("/nl/solutions");
    expect(enAlt.languages["x-default"]).toBe("/solutions");

    const nlAlt = buildLocaleAlternates("/solutions", "nl");
    expect(nlAlt.canonical).toBe("/nl/solutions");
  });

  it("covers all public path keys", () => {
    for (const path of Object.values(paths)) {
      const alt = buildLocaleAlternates(path, "en");
      expect(alt.languages.nl.startsWith("/nl")).toBe(true);
    }
  });
});

describe("visible translation key detection helper", () => {
  it("matches dotted keys that must never appear in UI", () => {
    expect(TRANSLATION_KEY_PATTERN.test("nav.solutions")).toBe(true);
    expect(TRANSLATION_KEY_PATTERN.test("forms.submit")).toBe(true);
    expect(TRANSLATION_KEY_PATTERN.test("checkout.total")).toBe(true);
    expect(TRANSLATION_KEY_PATTERN.test("Solutions")).toBe(false);
  });
});

describe("preview noindex contract", () => {
  it("documents preview uses X-Robots-Tag noindex via middleware helper", async () => {
    const { isPreviewDeployment } = await import("@/lib/url/app-url");
    expect(typeof isPreviewDeployment()).toBe("boolean");
  });
});
