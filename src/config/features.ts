/**
 * Runtime feature flags. Fail closed: checkout stays OFF unless explicitly enabled.
 *
 * Default (missing / any value other than the string "true"): OFF
 * Recommended for all environments during/after P0.5:
 *
 *   CHECKOUT_ENABLED=false
 *
 * Never enable until release-gate reports READY and operators approve manually.
 */
export function isDirectCheckoutEnabled(): boolean {
  return process.env.CHECKOUT_ENABLED === "true";
}
