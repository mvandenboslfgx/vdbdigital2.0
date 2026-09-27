import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GET /uitloggen must not sign out", () => {
  const src = readFileSync("src/app/(auth)/uitloggen/route.ts", "utf8");

  it("GET handler does not call signOut or applyPendingAuthCookies", () => {
    const getIdx = src.indexOf("export async function GET");
    const postIdx = src.indexOf("export async function POST");
    expect(getIdx).toBeGreaterThanOrEqual(0);
    expect(postIdx).toBeGreaterThan(getIdx);
    const getBody = src.slice(getIdx, postIdx);
    expect(getBody).not.toMatch(/signOut/);
    expect(getBody).not.toMatch(/applyPendingAuthCookies/);
    expect(getBody).toMatch(/405/);
    expect(getBody).toMatch(/Allow/);
  });

  it("POST handler performs explicit logout", () => {
    const postIdx = src.indexOf("export async function POST");
    const postBody = src.slice(postIdx);
    expect(postBody).toMatch(/signOut/);
    expect(postBody).toMatch(/applyPendingAuthCookies/);
    expect(postBody).toMatch(/\/inloggen/);
  });

  it("portal shell uses POST form, not Link href=/uitloggen", () => {
    const shell = readFileSync("src/components/portal/portal-shell.tsx", "utf8");
    expect(shell).not.toMatch(/href=["']\/uitloggen["']/);
    expect(shell).toMatch(/action=["']\/uitloggen["']/);
    expect(shell).toMatch(/method=["']POST["']/);
  });
});
