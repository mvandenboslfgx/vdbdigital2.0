import { describe, it, expect } from "vitest";
import { canManageProducts, canManageOrders } from "@/lib/auth/permissions";

describe("Admin authorization", () => {
  it("allows OWNER to manage products", () => {
    expect(canManageProducts("OWNER")).toBe(true);
  });

  it("blocks SUPPORT from managing products", () => {
    expect(canManageProducts("SUPPORT")).toBe(false);
  });

  it("allows ADMIN to manage orders", () => {
    expect(canManageOrders("ADMIN")).toBe(true);
  });

  it("blocks CONTENT from managing orders", () => {
    expect(canManageOrders("CONTENT")).toBe(false);
  });
});
