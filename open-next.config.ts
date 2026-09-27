import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter for Cloudflare Workers.
 *
 * Cookie ownership:
 * - /auth/callback, POST /uitloggen, /auth/session: handler writes
 * - GET /uitloggen is 405 (never mutates auth)
 * - all other routes: middleware/proxy owns refresh
 *
 * RSC must NOT write auth cookies (createServerSupabaseClient setAll is no-op).
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
        path.startsWith("/uitloggen")
      ) {
        return "handler" as const;
      }
      return "middleware" as const;
    },
  },
};
