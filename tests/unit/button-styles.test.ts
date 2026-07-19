import { describe, expect, it } from "vitest";
import {
  buttonVariantClass,
  buttonSizeClass,
  buttonClassName,
} from "@/components/ui/button-styles";

describe("button-styles surface contract", () => {
  it("keeps primary/danger surface-agnostic", () => {
    expect(buttonVariantClass("primary", "auto")).toContain("bg-primary");
    expect(buttonVariantClass("danger", "light")).toContain("bg-danger");
  });

  it("light tone outline uses light foreground and border", () => {
    const cls = buttonVariantClass("outline", "light");
    expect(cls).toContain("text-light-foreground");
    expect(cls).toContain("border-[#9aa6b5]");
    expect(cls).not.toMatch(/(?:^|\s)text-foreground(?:\s|$)/);
  });

  it("auto outline includes light-surface ancestor overrides", () => {
    const cls = buttonVariantClass("outline", "auto");
    expect(cls).toContain("in-data-[surface=light]:text-light-foreground");
    expect(cls).toContain("in-data-[surface=light]:border-[#9aa6b5]");
    expect(cls).toContain("text-foreground");
  });

  it("enforces minimum 44px interactive height", () => {
    expect(buttonSizeClass("sm")).toContain("min-h-11");
    expect(buttonSizeClass("md")).toContain("min-h-11");
    expect(buttonSizeClass("lg")).toContain("min-h-12");
  });

  it("composes focus-visible ring classes", () => {
    expect(buttonClassName({ variant: "outline", tone: "light" })).toContain(
      "focus-visible:outline-primary",
    );
  });
});
