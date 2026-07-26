import "server-only";
import {
  foundingClientOfferConfig,
  isFoundingCampaignWithinDates,
} from "@/config/commercial/founding-client-offer";
import { createServiceRoleClient, isSupabaseDatabaseReady } from "@/lib/database/server";

export interface FoundingClientState {
  enabled: boolean;
  maxClients: number;
  usedSlots: number;
  remainingSlots: number;
  canAccept: boolean;
  showCampaign: boolean;
}

async function readUsedSlotsFromDb(): Promise<number> {
  if (!isSupabaseDatabaseReady()) return 0;

  const supabase = createServiceRoleClient();
  const { data } = await supabase!
    .from("site_settings")
    .select("value")
    .eq("key", foundingClientOfferConfig.settingsKey)
    .maybeSingle();

  const raw = data?.value as { count?: number } | null;
  const count = typeof raw?.count === "number" ? raw.count : 0;
  return Math.max(0, Math.min(count, foundingClientOfferConfig.maxClients));
}

/** Server-side campaign state — never trust client counters */
export async function getFoundingClientState(): Promise<FoundingClientState> {
  const { enabled, maxClients } = foundingClientOfferConfig;

  // Public marketing TTFB: skip DB when the campaign cannot show.
  if (!enabled || !isFoundingCampaignWithinDates()) {
    return {
      enabled,
      maxClients,
      usedSlots: 0,
      remainingSlots: maxClients,
      canAccept: false,
      showCampaign: false,
    };
  }

  const usedSlots = await readUsedSlotsFromDb();
  const remainingSlots = Math.max(0, maxClients - usedSlots);
  const canAccept = remainingSlots > 0;

  return {
    enabled,
    maxClients,
    usedSlots,
    remainingSlots,
    canAccept,
    showCampaign: canAccept,
  };
}
