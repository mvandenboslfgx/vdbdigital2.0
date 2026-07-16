/** Shared limiter config helpers — safe for CLI (no server-only). */

export function isUpstashConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
