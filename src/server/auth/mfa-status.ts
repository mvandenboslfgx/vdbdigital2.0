import "server-only";
import { createServerSupabaseClient } from "@/lib/database/server";

export type MfaTotpFactorSummary = {
  id: string;
  status: "verified" | "unverified";
  friendlyName: string | null;
};

export type MfaStatus = {
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
  hasVerifiedFactor: boolean;
  hasEnrolledFactor: boolean;
  hasUnverifiedFactor: boolean;
  verifiedFactorId: string | null;
  unverifiedFactorId: string | null;
  factors: MfaTotpFactorSummary[];
};

export async function getMfaStatus(): Promise<MfaStatus | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  // `totp` is verified-only in Supabase typings; `all` includes unverified enrollments.
  const verified = factorsData?.totp ?? [];
  const unverified =
    factorsData?.all?.filter(
      (f) => f.factor_type === "totp" && f.status === "unverified",
    ) ?? [];

  const factors: MfaTotpFactorSummary[] = [
    ...verified.map((f) => ({
      id: f.id,
      status: "verified" as const,
      friendlyName: f.friendly_name ?? null,
    })),
    ...unverified.map((f) => ({
      id: f.id,
      status: "unverified" as const,
      friendlyName: f.friendly_name ?? null,
    })),
  ];

  return {
    currentLevel: (aalData?.currentLevel ?? "aal1") as "aal1" | "aal2",
    nextLevel: (aalData?.nextLevel ?? "aal1") as "aal1" | "aal2",
    hasVerifiedFactor: verified.length > 0,
    hasEnrolledFactor: factors.length > 0,
    hasUnverifiedFactor: unverified.length > 0,
    verifiedFactorId: verified[0]?.id ?? null,
    unverifiedFactorId: unverified[0]?.id ?? null,
    factors,
  };
}

export async function isAal2Session(): Promise<boolean> {
  const status = await getMfaStatus();
  return status?.currentLevel === "aal2";
}
