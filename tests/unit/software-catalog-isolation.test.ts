import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(".");

function read(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("software catalog route isolation", () => {
  it("marketing homepage does not import software seed inventory", () => {
    const home = read("src/app/(marketing)/page.tsx");
    expect(home).not.toMatch(/software-catalog\/generated-inventory/);
    expect(home).not.toMatch(/querySoftwareCatalog|softwareCatalogItems/);
  });

  it("software shop uses dedicated server repository", () => {
    const page = read("src/app/(shop)/shop/software/page.tsx");
    expect(page).toMatch(/software-public-catalog/);
    expect(page).not.toMatch(/softwareCatalogItems/);
  });

  it("main shop uses public-shop-catalog for DB products", () => {
    const shop = read("src/app/(shop)/shop/page.tsx");
    expect(shop).toMatch(/public-shop-catalog/);
    expect(shop).not.toMatch(/from ["']@\/config\/software-catalog/);
  });
});
