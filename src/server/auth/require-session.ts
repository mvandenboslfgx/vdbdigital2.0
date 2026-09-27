import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/database/server";
import { createServiceRoleClient } from "@/lib/database/server";
import { AuthError } from "@/server/auth/errors";
import type { AuthenticatedUser } from "@/server/auth/types";

export type PortalNavKind = "document" | "rsc" | "prefetch" | "unknown";

/** Soft vs hard navigation kind — safe, no PII. */
export async function detectPortalNavKind(): Promise<PortalNavKind> {
  const h = await headers();
  if (h.get("next-router-prefetch") === "1" || h.get("purpose") === "prefetch") {
    return "prefetch";
  }
  if (h.get("rsc") === "1" || h.get("next-router-state-tree")) {
    return "rsc";
  }
  const accept = h.get("accept") ?? "";
  if (accept.includes("text/html")) return "document";
  return "unknown";
}

export function logPortalLayer(
  layer: string,
  payload: Record<string, unknown>,
): void {
  console.info(
    JSON.stringify({
      type: "portal_layer",
      layer,
      t: Date.now(),
      ...payload,
    }),
  );
}

async function resolveEmailForSub(
  sub: string,
  claimsEmail: string | null,
): Promise<string | null> {
  if (claimsEmail && claimsEmail.includes("@")) return claimsEmail;

  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", sub)
    .maybeSingle();
  if (typeof profile?.email === "string" && profile.email.includes("@")) {
    return profile.email;
  }

  const { data, error } = await admin.auth.admin.getUserById(sub);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

/**
 * Trusted server auth via getClaims() (JWT verified; Proxy refreshes first).
 *
 * `sub` is sufficient for authentication. Missing email is NOT unauthenticated —
 * resolve from profile / auth.admin.
 *
 * Cached per-request so layout + page share one claims resolution.
 */
export const requireAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser> => {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new AuthError(
        "UNAUTHENTICATED",
        "Authenticatie niet geconfigureerd",
      );
    }

    const nav = await detectPortalNavKind();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const sub = typeof claims?.sub === "string" ? claims.sub : null;
    const claimsOk = Boolean(sub) && !error;

    logPortalLayer("rsc_getClaims", {
      pass: claimsOk,
      nav,
      hasEmailClaim: typeof claims?.email === "string",
    });

    if (error || !sub) {
      throw new AuthError("UNAUTHENTICATED");
    }

    const claimsEmail =
      typeof claims?.email === "string" ? claims.email : null;
    const email = await resolveEmailForSub(sub, claimsEmail);

    logPortalLayer("email_resolve", {
      pass: Boolean(email),
      fromClaims: Boolean(claimsEmail),
      nav,
    });

    // Authenticated without resolvable email → temporary, NOT login redirect.
    if (!email) {
      throw new Error("email_unresolvable");
    }

    return { id: sub, email };
  },
);

/** Optionele sessie — geen throw */
export async function getOptionalAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuthenticatedUser();
  } catch {
    return null;
  }
}
