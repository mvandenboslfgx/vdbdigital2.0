/**

 * Founding Client Offer — server-side source of truth.

 * Slot usage is tracked in site_settings when Supabase is available.

 * Discount amounts are DRAFT until campaign is approved and enabled.

 */

export const foundingClientOfferConfig = {

  /** Master switch — set FOUNDING_CLIENT_ENABLED=1 to show campaign */

  enabled: process.env.FOUNDING_CLIENT_ENABLED === "1",

  maxClients: Math.min(Number(process.env.FOUNDING_CLIENT_MAX ?? "10"), 10),

  settingsKey: "founding_client_used_slots",

  startDate: process.env.FOUNDING_CLIENT_START_DATE ?? null,

  endDate: process.env.FOUNDING_CLIENT_END_DATE ?? null,

  internalNotes: "DRAFT benefits — do not publish discount amounts until approved.",

  /** Must remain false until Matthijs approves public discount disclosure */

  discountApproved: false,

  /** Approx ~10% or value-add — DRAFT only */

  draftBenefits: {

    onepage: { foundingExclVatCents: 895_00, careMonths: 1 },

    launch: { foundingExclVatCents: 1525_00, careMonths: 2 },

    growth: { foundingExclVatCents: 2695_00, careMonths: 3 },

    custom: { foundingExclVatCents: null, notes: "discovery session / analysis / credit — proposal only" },

  },

} as const;



export function isFoundingCampaignWithinDates(now = new Date()): boolean {

  const { startDate, endDate } = foundingClientOfferConfig;

  if (startDate && now < new Date(startDate)) return false;

  if (endDate && now > new Date(endDate)) return false;

  return true;

}


