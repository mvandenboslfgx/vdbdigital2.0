import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(".");

function read(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("software shop route wiring", () => {
  it("software shop page uses server catalog repository", () => {
    const page = read("src/app/(shop)/shop/software/page.tsx");
    expect(page).toMatch(/software-public-catalog/);
    expect(page).toMatch(/SoftwareProcurementPanel/);
    expect(page).not.toMatch(/softwareCatalogItems/);
  });

  it("software detail resolves only public verified slugs", () => {
    const detail = read("src/app/(shop)/shop/software/[slug]/page.tsx");
    expect(detail).toMatch(/getPublicSoftwareBySlug/);
    expect(detail).toMatch(/notFound/);
  });

  it("main shop uses public-shop-catalog SSOT for DB products", () => {
    const shop = read("src/app/(shop)/shop/page.tsx");
    expect(shop).toMatch(/public-shop-catalog/);
    expect(shop).toMatch(/PillarNav/);
  });

  it("marketing homepage does not import software seed module", () => {
    const home = read("src/app/(marketing)/page.tsx");
    expect(home).not.toMatch(/software-catalog\/generated-inventory/);
  });
});

describe("software shop routes exist", () => {
  it("has software index and detail routes", () => {
    expect(existsSync(resolve(ROOT, "src/app/(shop)/shop/software/page.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(resolve(ROOT, "src/app/(shop)/shop/software/[slug]/page.tsx")),
    ).toBe(true);
  });
});
