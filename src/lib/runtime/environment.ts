/**
 * Bepaalt of development-fallbacks (seed data, in-memory orders) zijn toegestaan.
 * In productie nooit toegestaan.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function allowDevFallback(): boolean {
  return !isProductionRuntime();
}

export function requireSupabaseInProduction(): void {
  if (isProductionRuntime()) {
    throw new Error(
      "Supabase is verplicht in productie. Configureer NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en SUPABASE_SECRET_KEY.",
    );
  }
}
