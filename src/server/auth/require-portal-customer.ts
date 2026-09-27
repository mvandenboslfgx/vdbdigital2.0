import "server-only";
import { redirect } from "next/navigation";
import { AuthError } from "@/server/auth/errors";
import {
  requireCustomer,
  type CustomerContext,
} from "@/server/auth/require-customer";
import {
  detectPortalNavKind,
  logPortalLayer,
} from "@/server/auth/require-session";

/**
 * Portal pages must not throw AuthError into the Next.js global error UI
 * ("This page couldn't load" / "A server error occurred") while the shell
 * remains from a soft navigation.
 *
 * Redirect map (never collapse everything to /inloggen):
 * - UNAUTHENTICATED (no valid claims) → /inloggen
 * - ACCOUNT_DISABLED → /geen-toegang?reden=geblokkeerd
 * - FORBIDDEN (no org/membership after bootstrap) → /geen-toegang
 * - DB / bootstrap / email resolve → /geen-toegang?reden=tijdelijk
 */
export async function requirePortalCustomer(): Promise<CustomerContext> {
  const nav = await detectPortalNavKind();
  try {
    const ctx = await requireCustomer();
    logPortalLayer("require_portal_customer", {
      pass: true,
      nav,
      role: ctx.customerRole,
    });
    return ctx;
  } catch (err) {
    const code = err instanceof AuthError ? err.code : "UNKNOWN";
    const message =
      err instanceof Error ? err.message.slice(0, 120) : "unknown";
    logPortalLayer("require_portal_customer", {
      pass: false,
      nav,
      code,
      message,
      hasAuthError: err instanceof AuthError,
    });
    console.info(
      JSON.stringify({
        type: "portal_auth_redirect",
        code,
        message,
        nav,
        hasAuthError: err instanceof AuthError,
      }),
    );
    if (code === "UNAUTHENTICATED") {
      redirect("/inloggen");
    }
    if (code === "ACCOUNT_DISABLED") {
      redirect("/geen-toegang?reden=geblokkeerd");
    }
    if (code === "FORBIDDEN") {
      redirect("/geen-toegang");
    }
    redirect("/geen-toegang?reden=tijdelijk");
  }
}
