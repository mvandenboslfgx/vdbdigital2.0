import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter for Cloudflare Workers.
 *
 * Cookie ownership:
 * - /auth/callback, POST /uitloggen, /auth/session, /auth/probe/json: handler writes
 * - GET /uitloggen is prefetch-safe (no signOut) — must never clear auth cookies
 * - all other routes (incl. /auth/probe RSC): middleware/proxy owns refresh
 *
 * RSC must NOT write auth cookies (createServerSupabaseClient setAll is no-op).
 * That prevents Max-Age=0 clears on HTML responses from wiping a valid jar
 * when Proxy did not refresh on the same request.
 */
const base = defineCloudflareConfig({});

export default {
  ...base,
  dangerous: {
    ...base.dangerous,
    headersAndCookiesPriority(event: { rawPath?: string }) {
      const path = event.rawPath ?? "";
      if (
        path.startsWith("/auth/callback") ||
        path.startsWith("/auth/session") ||
        path.startsWith("/auth/probe/json") ||
        path.startsWith("/uitloggen")
      ) {
        return "handler" as const;
      }
      return "middleware" as const;
    },
  },
};
