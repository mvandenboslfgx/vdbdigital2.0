import { describe, expect, it } from "vitest";
import { formatDualPrice, formatPricePair } from "@/lib/utilities/commercial-price";
import { getCatalogItem } from "@/config/commercial/pricing";

describe("commercial price hierarchy", () => {
  it("splits NL starting price into layered labels without repeating From on incl", () => {
    const item = getCatalogItem("onepage-website");
    expect(item).toBeTruthy();
    const price = formatDualPrice(item!, "nl");
    expect(price.isQuoteOnly).toBe(false);
    expect(price.amountLabel).toMatch(/^Vanaf /);
    expect(price.vatExclNote).toBe("exclusief 21% btw");
    expect(price.inclAmountLabel).toMatch(/inclusief 21% btw/);
    expect(price.inclAmountLabel).not.toMatch(/Vanaf/);
    expect(price.scopeNote).toMatch(/kennismaking/);
  });

  it("splits EN starting price into layered labels", () => {
    const item = getCatalogItem("onepage-website");
    expect(item).toBeTruthy();
    const price = formatDualPrice(item!, "en");
    expect(price.amountLabel).toMatch(/^From /);
    expect(price.vatExclNote).toBe("excluding 21% VAT");
    expect(price.inclAmountLabel).not.toMatch(/From/);
    expect(price.scopeNote).toMatch(/introduction/);
  });

  it("formats quote-only maatwerk as proposal block", () => {
    const item = getCatalogItem("custom-website");
    expect(item).toBeTruthy();
    expect(item!.quoteOnly).toBe(true);

    const nl = formatDualPrice(item!, "nl");
    expect(nl.amountLabel).toBe("Prijs op aanvraag");
    expect(nl.vatExclNote).toBe("");
    expect(nl.inclAmountLabel).toBe("");
    expect(nl.scopeNote).toMatch(/Scope, planning/);
    expect(nl.isQuoteOnly).toBe(true);

    const en = formatDualPrice(item!, "en");
    expect(en.amountLabel).toBe("Available by proposal");
    expect(en.scopeNote).toMatch(/introduction/);
  });

  it("does not attach scope note for fixed (non starting_from) prices", () => {
    const price = formatPricePair(
      {
        exclVatCents: 10000,
        inclVatCents: 12100,
        mode: "fixed",
        vatRate: 0.21,
      },
      "en",
      false,
    );
    expect(price.scopeNote).toBe("");
    expect(price.isStartingFrom).toBe(false);
  });
});
