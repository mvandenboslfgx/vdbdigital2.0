/**
 * Supabase Secret key resolver voor CLI-scripts.
 * Print nooit waarden.
 */
let legacyWarned = false;

export function getSupabaseSecretKey(): string | undefined {
  if (process.env.SUPABASE_SECRET_KEY) {
    return process.env.SUPABASE_SECRET_KEY;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!legacyWarned) {
      legacyWarned = true;
      console.warn(
        "WARN: SUPABASE_SERVICE_ROLE_KEY is deprecated; migrate to SUPABASE_SECRET_KEY.",
      );
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  return undefined;
}

export function requireSupabaseSecretKey(): string {
  const key = getSupabaseSecretKey();
  if (!key) {
    console.error("Ontbrekende environment variable: SUPABASE_SECRET_KEY");
    process.exit(1);
  }
  return key;
}

export function hasPublicSupabaseKey(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
