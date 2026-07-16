/**
 * Appointment scheduling — provider-agnostic, server-validated.
 * Never trust client-supplied booking URLs.
 */

export type BookingProvider =
  | "calcom"
  | "google"
  | "calendly"
  | "external"
  | "disabled"
  | "none"
  | "google_calendar"
  | "cal_com"
  | "custom";

const SAFE_PROVIDERS = new Set<string>([
  "calcom",
  "google",
  "calendly",
  "external",
  "disabled",
  "none",
  "google_calendar",
  "cal_com",
  "custom",
]);

function readProvider(): BookingProvider {
  const raw = (process.env.BOOKING_PROVIDER ?? "disabled").trim().toLowerCase();
  if (!SAFE_PROVIDERS.has(raw)) return "disabled";
  return raw as BookingProvider;
}

function readSafeUrl(value: string | undefined): string {
  const url = value?.trim() ?? "";
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    // Block javascript: and data: already handled by protocol check
    return parsed.toString();
  } catch {
    return "";
  }
}

export const bookingConfig = {
  provider: readProvider(),
  enabled: process.env.BOOKING_ENABLED === "1",
  /** Primary public scheduling URL */
  url: readSafeUrl(process.env.BOOKING_PROVIDER_URL),
  onlineUrl: readSafeUrl(process.env.BOOKING_ONLINE_URL),
  inPersonUrl: readSafeUrl(process.env.BOOKING_IN_PERSON_URL),
  defaultMode: "online" as const,
  allowOnSite: true,
  allowClientChoice: true,
} as const;

export function isBookingUrlSafe(url: string): boolean {
  return Boolean(readSafeUrl(url));
}

export function getPrimaryBookingUrl(): string | null {
  if (bookingConfig.provider === "disabled" || bookingConfig.provider === "none") {
    return null;
  }
  if (!bookingConfig.enabled && !bookingConfig.url) {
    // Allow URL-only config without explicit BOOKING_ENABLED for backwards compat
    if (!bookingConfig.url && !bookingConfig.onlineUrl) return null;
  }
  const candidate = bookingConfig.onlineUrl || bookingConfig.url;
  return candidate || null;
}

export function isBookingConfigured(): boolean {
  if (bookingConfig.provider === "disabled" || bookingConfig.provider === "none") {
    return false;
  }
  return getPrimaryBookingUrl() !== null;
}

export type BookingResolution =
  | { available: true; url: string; provider: BookingProvider }
  | {
      available: false;
      fallbacks: Array<"quote" | "contact" | "whatsapp" | "email">;
    };

export function resolveBooking(): BookingResolution {
  const url = getPrimaryBookingUrl();
  if (url && bookingConfig.provider !== "disabled" && bookingConfig.provider !== "none") {
    return { available: true, url, provider: bookingConfig.provider };
  }
  return {
    available: false,
    fallbacks: ["quote", "contact", "whatsapp", "email"],
  };
}
