import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";

vi.mock("@/lib/database/server", () => ({
  createServiceRoleClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/server/auth/require-aal2", () => ({
  getAal2RedirectPath: vi.fn(async () => null),
}));

type QueryResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

function chainResult(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.maybeSingle = vi.fn(async () => result);
  // Thenable for await supabase.from(...).select(...).eq(...).eq(...)
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe("Auth no-access loop hardening — resolvePostLoginPath", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { getAal2RedirectPath } = await import("@/server/auth/require-aal2");
    vi.mocked(getAal2RedirectPath).mockResolvedValue(null);
  });

  it("routes OWNER/staff to /admin when MFA is satisfied", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: true }, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: { role: "OWNER" }, error: null });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    await expect(resolvePostLoginPath("user-owner")).resolves.toBe("/admin");
  });

  it("routes OWNER/staff to MFA setup when required", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    const { getAal2RedirectPath } = await import("@/server/auth/require-aal2");
    vi.mocked(getAal2RedirectPath).mockResolvedValue("/admin/mfa/setup");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: true }, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: { role: "OWNER" }, error: null });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    await expect(resolvePostLoginPath("user-owner")).resolves.toBe(
      "/admin/mfa/setup",
    );
  });

  it("routes customer with active membership to /portal", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: true }, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: null, error: null });
        }
        if (table === "organization_members") {
          return chainResult({
            data: [
              {
                id: "mem-1",
                customer_role: "PRIMARY",
                organization: {
                  id: "org-1",
                  legal_name: "Acme",
                  trade_name: null,
                  status: "ACTIVE",
                  type: "CUSTOMER",
                },
              },
            ],
            error: null,
          });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    await expect(resolvePostLoginPath("user-customer")).resolves.toBe("/portal");
  });

  it("routes authenticated user without profile to /geen-toegang (not /inloggen)", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: null, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: null, error: null });
        }
        if (table === "organization_members") {
          return chainResult({ data: [], error: null });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { AUTH_NO_ACCESS_PATH, resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    const path = await resolvePostLoginPath("user-no-profile");
    expect(path).toBe(AUTH_NO_ACCESS_PATH);
    expect(path).not.toContain("/inloggen");
  });

  it("routes authenticated user without membership to /geen-toegang", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: true }, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: null, error: null });
        }
        if (table === "organization_members") {
          return chainResult({ data: [], error: null });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { AUTH_NO_ACCESS_PATH, resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    await expect(resolvePostLoginPath("user-no-membership")).resolves.toBe(
      AUTH_NO_ACCESS_PATH,
    );
  });

  it("fail-closes to temporary no-access when organization tables are missing", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: true }, error: null });
        }
        if (table === "admin_roles") {
          return chainResult({ data: null, error: null });
        }
        if (table === "organization_members") {
          return chainResult({
            data: null,
            error: {
              message: 'relation "public.organization_members" does not exist',
              code: "42P01",
            },
          });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { isAuthNoAccessPath, resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    const path = await resolvePostLoginPath("user-schema-gap");
    expect(isAuthNoAccessPath(path)).toBe(true);
    expect(path).toContain("reden=tijdelijk");
    expect(path).not.toContain("/inloggen");
  });

  it("routes blocked profiles to terminal blocked no-access path", async () => {
    const { createServiceRoleClient } = await import("@/lib/database/server");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return chainResult({ data: { is_active: false }, error: null });
        }
        return chainResult({ data: null, error: null });
      }),
    } as never);

    const { isAuthNoAccessPath, resolvePostLoginPath } = await import(
      "@/server/auth/resolve-home"
    );
    const path = await resolvePostLoginPath("user-blocked");
    expect(isAuthNoAccessPath(path)).toBe(true);
    expect(path).toContain("reden=geblokkeerd");
  });
});

describe("Auth no-access loop hardening — redirect matrix (static)", () => {
  it("ships /geen-toegang page with logout and noindex", () => {
    const page = "src/app/(auth)/geen-toegang/page.tsx";
    expect(existsSync(page)).toBe(true);
    const src = readFileSync(page, "utf8");
    expect(src).toContain("logoutAction");
    expect(src).toContain("Uitloggen");
    expect(src).toContain("index: false");
    expect(src).toContain('dynamic = "force-dynamic"');
    expect(src).toContain("isAuthNoAccessPath");
    expect(src).not.toContain("organization_members");
    expect(src).not.toContain("admin_roles");
  });

  it("login page no longer treats geen-toegang as a self-target error", () => {
    const src = readFileSync("src/app/(auth)/inloggen/page.tsx", "utf8");
    expect(src).not.toContain("fout=geen-toegang");
    expect(src).not.toContain('fout === "geen-toegang"');
    expect(src).toContain("resolvePostLoginPath");
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("resolver never returns /inloggen for missing membership", () => {
    const src = readFileSync("src/server/auth/resolve-home.ts", "utf8");
    expect(src).toContain('AUTH_NO_ACCESS_PATH = "/geen-toegang"');
    expect(src).not.toContain("/inloggen?fout=geen-toegang");
    expect(src).not.toContain("/inloggen?fout=geblokkeerd");
  });

  it("callback still uses resolvePostLoginPath after successful exchange", () => {
    const src = readFileSync("src/app/auth/callback/route.ts", "utf8");
    expect(src).toContain("exchangeCodeForSession");
    expect(src).toContain("resolvePostLoginPath");
    expect(src).toContain("/inloggen?fout=sessie");
  });

  it("forbids loop patterns in source contracts", () => {
    const resolveSrc = readFileSync("src/server/auth/resolve-home.ts", "utf8");
    const loginSrc = readFileSync("src/app/(auth)/inloggen/page.tsx", "utf8");
    const noAccessSrc = readFileSync(
      "src/app/(auth)/geen-toegang/page.tsx",
      "utf8",
    );

    // No-access page must not bounce authenticated users back to /inloggen
    // when still unauthorized — only when session is absent.
    expect(noAccessSrc).toMatch(/if \(!user\) \{\s*redirect\("\/inloggen"\)/);
    expect(noAccessSrc).toContain("isAuthNoAccessPath(destination)");

    // Resolver terminal path is /geen-toegang, not /inloggen?fout=...
    expect(resolveSrc).toContain("return AUTH_NO_ACCESS_PATH");
    expect(loginSrc).not.toContain('fout === "geen-toegang"');
    expect(loginSrc).not.toContain("/inloggen?fout=geen-toegang");
  });

  it("allows /geen-toegang as safe internal path", async () => {
    const { isSafeInternalPath } = await import("@/lib/security/redirect");
    expect(isSafeInternalPath("/geen-toegang")).toBe(true);
    expect(isSafeInternalPath("/geen-toegang?reden=tijdelijk")).toBe(true);
  });
});
