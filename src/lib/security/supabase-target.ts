/**
 * Fail-closed Supabase project targeting.
 * Local/dev/preview must never write to production unless an explicit override is set.
 */

export const PRODUCTION_SUPABASE_PROJECT_REF = "nhsrdnjfsxfikfbdmdfj";
export const STAGING_SUPABASE_PROJECT_REF = "qzekuvmgfekzsowdecyk";

export const PRODUCTION_SUPABASE_HOST = `${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
export const STAGING_SUPABASE_HOST = `${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;

const ALLOW_PRODUCTION_WRITES_FLAG = "ALLOW_PRODUCTION_SUPABASE_WRITES";

export type EnvLike = Record<string, string | undefined>;

export function extractSupabaseProjectRef(
  url: string | undefined | null,
): string | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isProductionSupabaseUrl(url: string | undefined | null): boolean {
  const ref = extractSupabaseProjectRef(url);
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) return true;
  if (!url) return false;
  return url.toLowerCase().includes(PRODUCTION_SUPABASE_HOST);
}

export function isStagingSupabaseUrl(url: string | undefined | null): boolean {
  return extractSupabaseProjectRef(url) === STAGING_SUPABASE_PROJECT_REF;
}

export function isAuthorizedProductionSupabaseRun(env: EnvLike = process.env): boolean {
  if (env[ALLOW_PRODUCTION_WRITES_FLAG] === "1") return true;
  const isVercelProduction =
    env.VERCEL === "1" && env.VERCEL_ENV === "production";
  const appEnv = (env.APP_ENV ?? "").toLowerCase();
  if (appEnv === "local" || appEnv === "staging" || appEnv === "development") {
    return false;
  }
  return isVercelProduction;
}

export function assertSafeSupabaseTarget(env: EnvLike = process.env): void {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.SUPABASE_URL ??
    env.STAGING_SUPABASE_URL;
  if (!isProductionSupabaseUrl(url)) return;
  if (isAuthorizedProductionSupabaseRun(env)) return;

  throw new Error(
    `Refusing local/dev use of production Supabase (${PRODUCTION_SUPABASE_PROJECT_REF}). ` +
      `Point NEXT_PUBLIC_SUPABASE_URL at staging (${STAGING_SUPABASE_PROJECT_REF}) or local Docker. ` +
      `Override only with ${ALLOW_PRODUCTION_WRITES_FLAG}=1 for an explicit production run.`,
  );
}
