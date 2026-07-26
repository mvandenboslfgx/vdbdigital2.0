import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();
const mockCreateServiceRoleClient = vi.fn();

vi.mock("@/server/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/server/auth/require-permission", () => ({
  requirePermission: vi.fn(async () => {
    throw new Error("FORBIDDEN");
  }),
}));

vi.mock("@/lib/database/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
};

function createChain(final: { data: unknown; error: unknown; count?: number }): Chain {
  const chain: Chain = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
  };
  for (const key of Object.keys(chain) as (keyof Chain)[]) {
    if (key === "maybeSingle") {
      chain.maybeSingle.mockResolvedValue(final);
    } else {
      (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  }
  // Make awaitable for list queries
  (chain as unknown as PromiseLike<unknown>).then = (onfulfilled) =>
    Promise.resolve({ data: final.data, error: final.error, count: final.count ?? 0 }).then(
      onfulfilled,
    );
  return chain;
}

describe("admin quotes/invoices/documents scoping", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAdmin.mockReset();
    mockCreateServiceRoleClient.mockReset();
  });

  it("SUPPORT listAdminQuotes applies assigned or-filter", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "staff-support" },
      role: "SUPPORT",
    });

    const projectsChain = createChain({
      data: [{ id: "proj-1" }],
      error: null,
    });
    const quotesChain = createChain({ data: [], error: null, count: 0 });

    mockCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table === "portal_projects") return projectsChain;
        return quotesChain;
      },
    });

    const { listAdminQuotes } = await import("@/server/repositories/admin-quotes");
    await listAdminQuotes({});

    expect(quotesChain.or).toHaveBeenCalledWith(
      "created_by.eq.staff-support,project_id.in.(proj-1)",
    );
  });

  it("getAdminQuote returns null for out-of-scope record", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "staff-support" },
      role: "SUPPORT",
    });

    const projectsChain = createChain({ data: [{ id: "proj-own" }], error: null });
    const quoteChain = createChain({
      data: {
        id: "q-foreign",
        created_by: "other-user",
        project_id: "proj-other",
      },
      error: null,
    });

    mockCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table === "portal_projects") return projectsChain;
        return quoteChain;
      },
    });

    const { getAdminQuote } = await import("@/server/repositories/admin-quotes");
    const result = await getAdminQuote("q-foreign");
    expect(result).toBeNull();
  });

  it("SUPPORT listAdminDocuments filters to managed organizations", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "staff-support" },
      role: "SUPPORT",
    });

    const projectsChain = createChain({
      data: [{ organization_id: "org-a" }],
      error: null,
    });
    const docsChain = createChain({ data: [], error: null, count: 0 });

    mockCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table === "portal_projects") return projectsChain;
        return docsChain;
      },
    });

    const { listAdminDocuments } = await import(
      "@/server/repositories/admin-documents"
    );
    await listAdminDocuments({});
    expect(docsChain.in).toHaveBeenCalledWith("organization_id", ["org-a"]);
  });

  it("rejects caller organizationId outside managed set", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "staff-support" },
      role: "SUPPORT",
    });

    const projectsChain = createChain({
      data: [{ organization_id: "org-a" }],
      error: null,
    });

    mockCreateServiceRoleClient.mockReturnValue({
      from: () => projectsChain,
    });

    const { listAdminDocuments } = await import(
      "@/server/repositories/admin-documents"
    );
    const result = await listAdminDocuments({ organizationId: "org-b" });
    expect(result.documents).toEqual([]);
    expect(result.total).toBe(0);
  });
});
