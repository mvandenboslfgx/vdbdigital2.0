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

const DEFAULT_CALENDLY_URL =
  "https://calendly.com/verzamelvdbdigital/strategiegesprek";

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
  const raw = (process.env.BOOKING_PROVIDER ?? "calendly").trim().toLowerCase();
  if (!SAFE_PROVIDERS.has(raw)) return "disabled";
  return raw as BookingProvider;
}

function readSafeUrl(value: string | undefined): string {
  const url = value?.trim() ?? "";
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

const configuredUrl = readSafeUrl(process.env.BOOKING_PROVIDER_URL);
const defaultUrl = readSafeUrl(DEFAULT_CALENDLY_URL);

export const bookingConfig = {
  provider: readProvider(),
  enabled: process.env.BOOKING_ENABLED !== "0",
  url: configuredUrl || defaultUrl,
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
  if (
    bookingConfig.provider === "disabled" ||
    bookingConfig.provider === "none" ||
    !bookingConfig.enabled
  ) {
    return null;
  }
  return bookingConfig.onlineUrl || bookingConfig.url || null;
}

export function isBookingConfigured(): boolean {
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
  if (url) return { available: true, url, provider: bookingConfig.provider };
  return {
    available: false,
    fallbacks: ["quote", "contact", "whatsapp", "email"],
  };
}
