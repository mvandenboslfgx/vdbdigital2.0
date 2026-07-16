import "server-only";
import { createServerSupabaseClient } from "@/lib/database/server";

export type MfaStatus = {
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
  hasVerifiedFactor: boolean;
  hasEnrolledFactor: boolean;
};

export async function getMfaStatus(): Promise<MfaStatus | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedFactors =
    factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
  const allFactors = factorsData?.totp ?? [];

  return {
    currentLevel: (aalData?.currentLevel ?? "aal1") as "aal1" | "aal2",
    nextLevel: (aalData?.nextLevel ?? "aal1") as "aal1" | "aal2",
    hasVerifiedFactor: verifiedFactors.length > 0,
    hasEnrolledFactor: allFactors.length > 0,
  };
}

export async function isAal2Session(): Promise<boolean> {
  const status = await getMfaStatus();
  return status?.currentLevel === "aal2";
}
