import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Contact FAB (no external livechat widget)", () => {
  it("ships a contact-only floating CTA", () => {
    const src = readFileSync("src/components/chat/contact-fab.tsx", "utf8");
    expect(src).toContain("paths.contact");
    expect(src).not.toMatch(/tawk|Tawk_API|embed\.tawk/i);
  });

  it("marketing layout uses ContactFab", () => {
    const layout = readFileSync("src/components/layout/marketing-layout.tsx", "utf8");
    expect(layout).toContain("ContactFab");
    expect(layout).not.toContain("ChatProvider");
  });
});
