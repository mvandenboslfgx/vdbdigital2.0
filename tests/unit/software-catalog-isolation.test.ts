import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(".");

function read(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("software catalog route isolation", () => {
  it("marketing homepage does not import software-catalog", () => {
    const home = read("src/app/(marketing)/page.tsx");
    expect(home).not.toMatch(/software-catalog/);
    expect(home).not.toMatch(/querySoftwareCatalog|softwareCatalogItems/);
  });

  it("packages page does not import software-catalog", () => {
    const packagesPage = read("src/app/(marketing)/packages/page.tsx");
    expect(packagesPage).not.toMatch(/from ["']@\/config\/software-catalog/);
    expect(packagesPage).toMatch(/website-packages/);
  });

  it("marketing layout / header do not import software-catalog", () => {
    const header = read("src/components/navigation/header.tsx");
    const layout = read("src/components/layout/marketing-layout.tsx");
    expect(header).not.toMatch(/software-catalog/);
    expect(layout).not.toMatch(/software-catalog/);
  });

  it("shop routes do import software-catalog", () => {
    const shop = read("src/app/(shop)/shop/page.tsx");
    const detail = read("src/app/(shop)/shop/[slug]/page.tsx");
    expect(shop).toMatch(/software-catalog/);
    expect(detail).toMatch(/software-catalog/);
  });
});
