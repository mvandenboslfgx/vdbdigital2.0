import { describe, it, expect } from "vitest";
import {
  getCaseBySlug,
  getPublicCases,
  isCasePubliclyVisible,
} from "@/config/commercial/cases";

describe("Vermeulen Bouwservice case", () => {
  it("is published as a real live client case", () => {
    const c = getCaseBySlug("vermeulen-bouwservice");
    expect(c).toBeDefined();
    expect(c!.type).toBe("real");
    expect(c!.status).toBe("PUBLISHED");
    expect(c!.publicVisible).toBe(true);
    expect(c!.externalUrl).toBe("https://www.vermeulenbouwservice.nl/");
    expect(isCasePubliclyVisible("vermeulen-bouwservice")).toBe(true);
  });

  it("appears in public cases without invented metrics flags", () => {
    const publicCases = getPublicCases();
    expect(publicCases.some((c) => c.slug === "vermeulen-bouwservice")).toBe(
      true,
    );
    const v = getCaseBySlug("vermeulen-bouwservice")!;
    expect(v.permissions.testimonialPermission).toBe(false);
    expect(v.permissions.screenshotPermission).toBe(true);
  });
});
