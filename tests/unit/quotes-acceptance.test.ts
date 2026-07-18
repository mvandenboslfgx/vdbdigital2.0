import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  isQuoteAcceptableStatus,
  isQuoteExpired,
  lineTotals,
  quoteHeaderTotals,
  taxCentsFromNet,
} from "@/lib/commerce/quote-money";
import {
  assertQuoteCanBeSent,
  assertQuoteExpectedVersion,
  isQuoteSendableStatus,
  validateSelectedOptionalQuoteItems,
} from "@/lib/commerce/quote-status";
import { hasPermission } from "@/lib/auth/permissions";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";

describe("quote money — minor units", () => {
  it("computes tax from basis points without float VAT", () => {
    expect(taxCentsFromNet(10000, 2100)).toBe(2100);
    expect(taxCentsFromNet(100, 2100)).toBe(21);
  });

  it("line totals use integer cents", () => {
    const t = lineTotals({
      quantity: 2,
      unitPriceCents: 5000,
      discountCents: 1000,
      taxRateBasisPoints: 2100,
    });
    expect(t.subtotalCents).toBe(9000);
    expect(t.taxCents).toBe(1890);
    expect(t.totalCents).toBe(10890);
  });

  it("skips unselected optional lines in header totals", () => {
    const t = quoteHeaderTotals([
      { quantity: 1, unitPriceCents: 10000, taxRateBasisPoints: 2100 },
      {
        quantity: 1,
        unitPriceCents: 5000,
        taxRateBasisPoints: 2100,
        isOptional: true,
        isSelected: false,
      },
    ]);
    expect(t.subtotalCents).toBe(10000);
    expect(t.taxCents).toBe(2100);
    expect(t.totalCents).toBe(12100);
  });

  it("includes selected optional lines", () => {
    const t = quoteHeaderTotals([
      { quantity: 1, unitPriceCents: 10000, taxRateBasisPoints: 0 },
      {
        quantity: 1,
        unitPriceCents: 2500,
        taxRateBasisPoints: 0,
        isOptional: true,
        isSelected: true,
      },
    ]);
    expect(t.subtotalCents).toBe(12500);
    expect(t.totalCents).toBe(12500);
  });
});

describe("quote send — READY-only", () => {
  it("allows READY → SENT", () => {
    expect(assertQuoteCanBeSent("READY")).toEqual({ ok: true });
    expect(isQuoteSendableStatus("READY")).toBe(true);
  });

  it("blocks DRAFT → SENT", () => {
    expect(assertQuoteCanBeSent("DRAFT")).toEqual({
      ok: false,
      code: "NOT_READY",
    });
  });

  it("blocks IN_REVIEW → SENT", () => {
    expect(assertQuoteCanBeSent("IN_REVIEW")).toEqual({
      ok: false,
      code: "NOT_READY",
    });
  });

  it("blocks re-send from SENT/VIEWED", () => {
    expect(assertQuoteCanBeSent("SENT")).toEqual({
      ok: false,
      code: "ALREADY_SENT",
    });
    expect(assertQuoteCanBeSent("VIEWED")).toEqual({
      ok: false,
      code: "ALREADY_SENT",
    });
  });

  it("blocks wrong expected version", () => {
    expect(assertQuoteExpectedVersion(3, 3)).toBe(true);
    expect(assertQuoteExpectedVersion(3, 2)).toBe(false);
    expect(assertQuoteExpectedVersion(3, 4)).toBe(false);
  });

  it("sendQuoteAction enforces READY-only (no DRAFT shortcut)", () => {
    const src = readFileSync("src/server/actions/quote-actions.ts", "utf8");
    expect(src).toContain("assertQuoteCanBeSent");
    expect(src).toContain("assertQuoteExpectedVersion");
    expect(src).not.toMatch(/\["READY",\s*"DRAFT"\]\.includes\(q\.status\)/);
  });

  it("admin UI only shows send for READY", () => {
    const src = readFileSync(
      "src/app/admin/(protected)/quotes/[id]/page.tsx",
      "utf8",
    );
    expect(src).toContain('quote.status === "READY"');
    expect(src).not.toContain('["READY", "DRAFT"]');
  });
});

describe("quote optional selection — accept contract", () => {
  const required = { id: "req-1", isOptional: false };
  const optionalA = { id: "opt-a", isOptional: true };
  const optionalB = { id: "opt-b", isOptional: true };
  const items = [required, optionalA, optionalB];

  it("accepts valid optional ids and revalidates server-side", () => {
    const result = validateSelectedOptionalQuoteItems(items, ["opt-a"]);
    expect(result).toEqual({ ok: true, selectedIds: ["opt-a"] });
  });

  it("rejects unknown item ids", () => {
    const result = validateSelectedOptionalQuoteItems(items, ["missing"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN_ITEM");
  });

  it("rejects required / non-selectable items as optional selection", () => {
    const result = validateSelectedOptionalQuoteItems(items, ["req-1"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_OPTIONAL");
  });

  it("rejects duplicate optional ids", () => {
    const result = validateSelectedOptionalQuoteItems(items, [
      "opt-a",
      "opt-a",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DUPLICATE_ID");
  });

  it("portal accept path validates optionals before RPC", () => {
    const src = readFileSync("src/server/actions/portal-actions.ts", "utf8");
    expect(src).toContain("validateSelectedOptionalQuoteItems");
    expect(src).toContain("accept_portal_quote");
  });
});

describe("quote acceptance gates", () => {
  it("only SENT/VIEWED are acceptable", () => {
    expect(isQuoteAcceptableStatus("SENT")).toBe(true);
    expect(isQuoteAcceptableStatus("VIEWED")).toBe(true);
    expect(isQuoteAcceptableStatus("DRAFT")).toBe(false);
    expect(isQuoteAcceptableStatus("WITHDRAWN")).toBe(false);
    expect(isQuoteAcceptableStatus("ACCEPTED")).toBe(false);
  });

  it("blocks expired quotes by date even if status not updated", () => {
    expect(isQuoteExpired("2020-01-01", new Date("2026-07-16"))).toBe(true);
    expect(isQuoteExpired("2099-12-31", new Date("2026-07-16"))).toBe(false);
    expect(isQuoteExpired(null)).toBe(false);
  });
});

describe("quote permissions", () => {
  it("OWNER and ADMIN can send; CONTENT cannot", () => {
    expect(hasPermission("OWNER", "quotes.send")).toBe(true);
    expect(hasPermission("ADMIN", "quotes.send")).toBe(true);
    expect(hasPermission("CONTENT", "quotes.send")).toBe(false);
    expect(hasPermission("CONTENT", "quotes.create")).toBe(true);
  });

  it("SUPPORT can view assigned only; cannot withdraw", () => {
    expect(hasPermission("SUPPORT", "quotes.view_assigned")).toBe(true);
    expect(hasPermission("SUPPORT", "quotes.withdraw")).toBe(false);
  });

  it("VIEW_ONLY cannot accept or decline", () => {
    expect(hasCustomerPermission("VIEW_ONLY", "portal.quotes.view")).toBe(true);
    expect(hasCustomerPermission("VIEW_ONLY", "portal.quotes.accept")).toBe(
      false,
    );
    expect(hasCustomerPermission("VIEW_ONLY", "portal.quotes.decline")).toBe(
      false,
    );
  });
});

describe("quote routes & migration present", () => {
  it("ships admin and portal quote routes", () => {
    for (const path of [
      "src/app/admin/(protected)/quotes/page.tsx",
      "src/app/admin/(protected)/quotes/new/page.tsx",
      "src/app/admin/(protected)/quotes/[id]/page.tsx",
      "src/app/admin/(protected)/quotes/[id]/edit/page.tsx",
      "src/app/admin/(protected)/quotes/[id]/preview/page.tsx",
      "src/app/admin/(protected)/quotes/[id]/versions/page.tsx",
      "src/app/portal/(protected)/offertes/page.tsx",
      "src/app/portal/(protected)/offertes/[id]/page.tsx",
      "src/app/portal/(protected)/offertes/[id]/accepteren/page.tsx",
      "src/app/portal/(protected)/offertes/[id]/afwijzen/page.tsx",
      "supabase/migrations/20260719140000_quotes_acceptance.sql",
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });

  it("does not couple quotes to Mollie in migration", () => {
    const sql = readFileSync(
      "supabase/migrations/20260719140000_quotes_acceptance.sql",
      "utf8",
    );
    expect(sql).toContain("no_mollie_coupling");
    expect(sql).not.toMatch(
      /ADD COLUMN[^;]*\b(mollie_payment_id|checkout_session_id|payment_id)\b/i,
    );
  });
});
