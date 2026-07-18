import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createProductSchema,
  productPricingSchema,
  eurosToCents,
  legalApprovalSchema,
  bulkActionSchema,
  mediaUploadMetaSchema,
} from "@/lib/validation/catalog";
import {
  getCheckoutBlockReasons,
  getCheckoutBlockLabelsNl,
  billingWarningNl,
  isDirectlySellableServerSide,
} from "@/lib/commerce/catalog-admin-eligibility";
import {
  buildPublicationChecklist,
  canPublishAsMarketing,
  publicationBlockingErrors,
} from "@/lib/commerce/publication-checklist";
import { sanitizeProductHtml } from "@/lib/security/sanitize-html";
import {
  escapeCsvCell,
  parseCsv,
  normalizeImportedCell,
  FORBIDDEN_IMPORT_HEADERS,
} from "@/lib/catalog/csv";
import { canAddToDirectCheckout, resolvePriceMode } from "@/lib/commerce/checkout-eligibility";
import { hasPermission, SENSITIVE_PERMISSIONS } from "@/lib/auth/permissions";
import type { Product } from "@/types";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "test-product",
    name: "Test Product",
    shortDescription: "Korte tekst",
    fullDescription: "Lange tekst",
    categorySlug: "websites",
    categoryName: "Websites",
    priceCents: 10000,
    fromPriceCents: null,
    billingType: "ONE_TIME",
    deliveryTime: "2 weken",
    includedItems: ["A"],
    excludedItems: [],
    extensions: [],
    faqs: [],
    status: "PUBLISHED",
    featured: false,
    sortOrder: 1,
    seoTitle: "SEO",
    seoDescription: "Meta",
    priceMode: "FIXED",
    audienceB2b: true,
    audienceB2c: false,
    priceStatus: "DRAFT",
    legalStatus: "NOT_REVIEWED",
    publicationReady: false,
    ...overrides,
  };
}

describe("catalog validation", () => {
  it("accepteert vaste prijs in centen", () => {
    const parsed = productPricingSchema.safeParse({
      priceMode: "FIXED",
      billingType: "ONE_TIME",
      priceCents: 12500,
      fromPriceCents: null,
      currency: "EUR",
      vatPercent: 21,
      priceIncludesVat: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("weigert vaste prijs zonder bedrag", () => {
    const parsed = productPricingSchema.safeParse({
      priceMode: "FIXED",
      billingType: "ONE_TIME",
      priceCents: null,
      fromPriceCents: null,
      currency: "EUR",
      vatPercent: 21,
      priceIncludesVat: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepteert vanaf-prijs", () => {
    const parsed = productPricingSchema.safeParse({
      priceMode: "STARTING_FROM",
      billingType: "ONE_TIME",
      priceCents: null,
      fromPriceCents: 5000,
      currency: "EUR",
      vatPercent: 21,
      priceIncludesVat: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepteert quote-only zonder prijs", () => {
    const parsed = productPricingSchema.safeParse({
      priceMode: "QUOTE_ONLY",
      billingType: "QUOTE_ONLY",
      priceCents: null,
      fromPriceCents: null,
      currency: "EUR",
      vatPercent: 21,
      priceIncludesVat: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("parst euro's naar centen zonder float-geld", () => {
    expect(eurosToCents("12,50")).toBe(1250);
    expect(eurosToCents("12.5")).toBe(1250);
    expect(eurosToCents("abc")).toBeNull();
  });

  it("valideert create product payload", () => {
    const parsed = createProductSchema.safeParse({
      name: "Starter website",
      slug: "starter-website",
      shortDescription: "Kort",
      fullDescription: "Lang",
      tags: [],
      sortOrder: 1,
      featured: false,
      deliveryTime: "",
      includedItems: ["a"],
      excludedItems: [],
      extensions: [],
      benefits: [],
      requiredInput: [],
      seoTitle: "",
      seoDescription: "",
      audienceB2b: true,
      audienceB2c: false,
      pricing: {
        priceMode: "FIXED",
        billingType: "ONE_TIME",
        priceCents: 9900,
        fromPriceCents: null,
        currency: "EUR",
        vatPercent: 21,
        priceIncludesVat: false,
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("billing waarschuwing", () => {
  it("toont waarschuwing voor MONTHLY/YEARLY", () => {
    expect(billingWarningNl("MONTHLY")).toMatch(/niet actief/i);
    expect(billingWarningNl("YEARLY")).toMatch(/offerte/i);
    expect(billingWarningNl("ONE_TIME")).toBeNull();
  });
});

describe("checkout eligibility admin blockers", () => {
  const prev = process.env.CHECKOUT_ENABLED;

  beforeEach(() => {
    process.env.CHECKOUT_ENABLED = "false";
  });

  afterEach(() => {
    process.env.CHECKOUT_ENABLED = prev;
  });

  it("blokkeert altijd wanneer checkout flag OFF is", () => {
    const reasons = getCheckoutBlockReasons(baseProduct());
    expect(reasons).toContain("CHECKOUT_DISABLED");
    expect(getCheckoutBlockLabelsNl(baseProduct())[0]).toMatch(/algemeen uitgeschakeld/i);
    expect(isDirectlySellableServerSide(baseProduct())).toBe(false);
    expect(canAddToDirectCheckout(baseProduct())).toBe(false);
  });

  it("blokkeert STARTING_FROM", () => {
    const reasons = getCheckoutBlockReasons(
      baseProduct({ priceMode: "STARTING_FROM", fromPriceCents: 5000, priceCents: null }),
    );
    expect(reasons).toContain("STARTING_FROM");
  });

  it("blokkeert MONTHLY billing", () => {
    const reasons = getCheckoutBlockReasons(baseProduct({ billingType: "MONTHLY" }));
    expect(reasons).toContain("RECURRING_BILLING");
  });

  it("blokkeert ontbrekende B2B legal approval", () => {
    const reasons = getCheckoutBlockReasons(baseProduct());
    expect(reasons).toContain("NO_B2B_LEGAL");
  });

  it("resolvePriceMode respecteert opgeslagen priceMode", () => {
    expect(resolvePriceMode(baseProduct({ priceMode: "QUOTE_ONLY", priceCents: 100 }))).toBe(
      "QUOTE_ONLY",
    );
  });
});

describe("publication checklist", () => {
  it("staat marketingpublicatie toe zonder checkout eligibility", () => {
    const p = baseProduct({ status: "DRAFT", priceMode: "QUOTE_ONLY", priceCents: null });
    expect(canPublishAsMarketing(p)).toBe(true);
    expect(publicationBlockingErrors(p).length).toBe(0);
  });

  it("blokkeert publicatie bij ontbrekende prijs voor FIXED", () => {
    const p = baseProduct({ priceMode: "FIXED", priceCents: null, shortDescription: "x", fullDescription: "y" });
    const checklist = buildPublicationChecklist(p);
    expect(checklist.some((i) => i.code === "PRICE" && i.severity === "error")).toBe(true);
  });

  it("noemt checkout flag in checklist", () => {
    process.env.CHECKOUT_ENABLED = "false";
    const checklist = buildPublicationChecklist(baseProduct());
    expect(checklist.some((i) => i.code === "CHECKOUT_FLAG")).toBe(true);
  });
});

describe("rich text sanitize", () => {
  it("verwijdert scripts en javascript links", () => {
    const dirty =
      '<p>Hallo</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://vdb.example">ok</a>';
    const clean = sanitizeProductHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('href="https://vdb.example"');
  });
});

describe("CSV safety", () => {
  it("voorkomt CSV injection", () => {
    expect(escapeCsvCell("=CMD()")).toBe("'=CMD()");
    expect(escapeCsvCell("+1+1")).toBe("'+1+1");
  });

  it("normaliseert geïmporteerde cellen", () => {
    expect(normalizeImportedCell("'=CMD()")).toBe("=CMD()");
  });

  it("parst eenvoudige CSV", () => {
    const rows = parseCsv('a,b\n"1,2",3\n');
    expect(rows[0]).toEqual(["a", "b"]);
    expect(rows[1]).toEqual(["1,2", "3"]);
  });

  it("verbiedt legal/checkout kolommen bij import", () => {
    expect(FORBIDDEN_IMPORT_HEADERS).toContain("legal_status");
    expect(FORBIDDEN_IMPORT_HEADERS).toContain("checkout_eligible");
  });
});

describe("media validatie", () => {
  it("weigert te grote bestanden en ongeldige MIME", () => {
    const bad = mediaUploadMetaSchema.safeParse({
      productId: "00000000-0000-4000-8000-000000000001",
      mimeType: "application/pdf",
      byteSize: 100,
      fileName: "x.pdf",
    });
    expect(bad.success).toBe(false);

    const tooBig = mediaUploadMetaSchema.safeParse({
      productId: "00000000-0000-4000-8000-000000000001",
      mimeType: "image/png",
      byteSize: 9_000_000,
      fileName: "x.png",
    });
    expect(tooBig.success).toBe(false);
  });
});

describe("bulkacties schema", () => {
  it("ondersteunt veilige bulkacties zonder legal/checkout", () => {
    const parsed = bulkActionSchema.safeParse({
      productIds: ["00000000-0000-4000-8000-000000000001"],
      action: "hide",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("legal approval permissions", () => {
  it("CONTENT mag geen legal approval", () => {
    expect(hasPermission("CONTENT", "products.legal_approve")).toBe(false);
    expect(hasPermission("ADMIN", "products.legal_approve")).toBe(false);
    expect(hasPermission("OWNER", "products.legal_approve")).toBe(true);
  });

  it("legal approval is sensitive (AAL2)", () => {
    expect(SENSITIVE_PERMISSIONS.has("products.legal_approve")).toBe(true);
  });

  it("legal schema vereist expliciete status", () => {
    const parsed = legalApprovalSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      expectedVersion: 1,
      legalStatus: "APPROVED_FOR_B2B",
      priceStatus: "APPROVED",
      publicationReady: true,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("archive / audience", () => {
  it("gearchiveerd product blijft checkout geblokkeerd", () => {
    process.env.CHECKOUT_ENABLED = "false";
    const reasons = getCheckoutBlockReasons(baseProduct({ status: "ARCHIVED" }));
    expect(reasons).toContain("ARCHIVED");
  });

  it("B2C doelgroep zonder legal blijft geblokkeerd", () => {
    const reasons = getCheckoutBlockReasons(
      baseProduct({ audienceB2c: true, legalStatus: "NOT_REVIEWED" }),
      "B2C",
    );
    expect(reasons).toContain("NO_B2C_LEGAL");
  });
});
