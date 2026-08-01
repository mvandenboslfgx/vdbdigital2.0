import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("owner admin support actions", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/server/actions/admin-support-actions.ts"),
    "utf8",
  );

  it("uses canonical Owner RPCs and never falls back internal note to public reply", () => {
    expect(source).toMatch(/reply_portal_support_ticket/);
    expect(source).toMatch(/add_portal_support_internal_note/);
    expect(source).toMatch(/transition_portal_support_ticket_status/);
    expect(source).toMatch(/support_internal_notes_rpc/);
    expect(source).toMatch(/FEATURE_DISABLED/);
    expect(source).not.toMatch(/is_internal:\s*true/);
  });

  it("requires support.manage and audits mutations", () => {
    expect(source).toMatch(/support\.manage/);
    expect(source).toMatch(/admin\.support\.reply_public/);
    expect(source).toMatch(/admin\.support\.internal_note/);
    expect(source).toMatch(/admin\.support\.status_transition/);
  });
});
