import "server-only";
import { isProductionRuntime } from "@/lib/runtime/environment";
import {
  MAX_WAF_WINDOW_MINUTES,
  WAF_EXCLUDED_PATHS,
  WAF_PUBLIC_MUTATION_PATHS,
  WAF_PUBLIC_MUTATION_PATH_PREFIXES,
} from "@/config/waf-routes";
import {
  createServiceRoleClient,
  isSupabaseDatabaseReady,
} from "@/lib/database/server";
import { buildRateLimitStorageKey } from "@/lib/security/rate-limit-key";
import { logCheckoutEvent } from "@/lib/observability/checkout-log";
import { isUpstashConfigured } from "@/lib/security/rate-limit-config";

export { isUpstashConfigured } from "@/lib/security/rate-limit-config";

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

/** Development only — not a production limiter */
const devBuckets = new Map<string, { count: number; resetAt: number }>();
const DEV_WINDOW_MS = 60_000;

const BUCKET_LIMITS: Record<string, number> = {
  contact: 5,
  quote: 3,
  support: 10,
  checkout: 5,
  payment: 5,
  "documents-upload": 20,
  "documents-download": 60,
  "portal-documents-upload": 10,
  "portal-documents-download": 40,
};

/** Buckets that must fail closed without a working app limiter */
const FAIL_CLOSED_BUCKETS = new Set(["checkout", "payment"]);

function windowLimit(bucket: string): number {
  return BUCKET_LIMITS[bucket] ?? 10;
}

/** Preview deployments also use NODE_ENV=production — require durable limiter */
function requiresDurableLimiter(): boolean {
  return isProductionRuntime() || process.env.VERCEL_ENV === "preview";
}

function devRateLimit(bucket: string, identifier: string): RateLimitResult {
  const limit = windowLimit(bucket);
  const key = buildRateLimitStorageKey(bucket, identifier);
  const now = Date.now();
  const entry = devBuckets.get(key);

  if (!entry || now > entry.resetAt) {
    devBuckets.set(key, { count: 1, resetAt: now + DEV_WINDOW_MS });
    return { success: true };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return {
      success: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { success: true };
}

async function upstashRateLimit(
  bucket: string,
  identifier: string,
): Promise<RateLimitResult | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const key = buildRateLimitStorageKey(bucket, identifier);
  const limit = windowLimit(bucket);
  const windowSeconds = 60;

  try {
    const incrRes = await fetch(`${base}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = Number(incrJson.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    if (count === 1) {
      await fetch(`${base}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }

    if (count > limit) {
      return { success: false, retryAfterSeconds: windowSeconds };
    }
    return { success: true };
  } catch {
    return null;
  }
}

async function databaseRateLimit(
  bucket: string,
  identifier: string,
): Promise<RateLimitResult | null> {
  if (!isSupabaseDatabaseReady()) return null;
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const key = buildRateLimitStorageKey(bucket, identifier);
  const limit = windowLimit(bucket);
  const windowSeconds = 60;

  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error || data == null) return null;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return null;

    const allowed = Boolean((row as { allowed?: boolean }).allowed);
    const retry = Number((row as { retry_after_seconds?: number }).retry_after_seconds ?? 0);

    if (allowed) return { success: true };
    return {
      success: false,
      retryAfterSeconds: retry > 0 ? retry : windowSeconds,
    };
  } catch {
    return null;
  }
}

/**
 * Application rate limit.
 * - Local development: hashed in-memory buckets
 * - Preview/Production: Upstash and/or Supabase RPC; fail closed for checkout/payment
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
): Promise<RateLimitResult> {
  const id = (identifier || "anonymous").trim() || "anonymous";

  if (!requiresDurableLimiter()) {
    return devRateLimit(bucket, id);
  }

  const upstash = await upstashRateLimit(bucket, id);
  if (upstash) return upstash;

  const db = await databaseRateLimit(bucket, id);
  if (db) return db;

  if (FAIL_CLOSED_BUCKETS.has(bucket)) {
    logCheckoutEvent("limiter.unavailable", {
      meta: { bucket, backend: "none" },
    });
    return { success: false, retryAfterSeconds: 60 };
  }

  return { success: true };
}

export function usesVercelWafRateLimiting(): boolean {
  return requiresDurableLimiter();
}

export function usesApplicationRateLimiting(): boolean {
  if (!requiresDurableLimiter()) return true;
  return isUpstashConfigured() || isSupabaseDatabaseReady();
}

export function rateLimitErrorMessage(result: RateLimitResult): string {
  if (result.retryAfterSeconds) {
    return `Too many requests. Please try again in ${result.retryAfterSeconds} seconds.`;
  }
  return "Too many requests. Please try again later.";
}

export {
  MAX_WAF_WINDOW_MINUTES,
  WAF_EXCLUDED_PATHS,
  WAF_PUBLIC_MUTATION_PATHS,
  WAF_PUBLIC_MUTATION_PATH_PREFIXES,
};

/** @deprecated Gebruik src/config/waf-routes.ts */
export const WAF_PROTECTED_ROUTES = [
  ...WAF_PUBLIC_MUTATION_PATHS.map((path) => ({
    path,
    method: "POST" as const,
  })),
  ...WAF_PUBLIC_MUTATION_PATH_PREFIXES.map((prefix) => ({
    path: `${prefix}*`,
    method: "POST" as const,
  })),
] as const;

export function isWafExcludedPath(path: string): boolean {
  return WAF_EXCLUDED_PATHS.some(
    (excluded) => path === excluded || path.startsWith(excluded),
  );
}

/** Test helper — clear in-memory buckets */
export function __resetDevRateLimitBucketsForTests(): void {
  devBuckets.clear();
}
