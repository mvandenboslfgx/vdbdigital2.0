import { getPublicEnv } from "@/config/env";

export function getTawkPublicConfig() {
  const env = getPublicEnv();
  return {
    propertyId: env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? "",
    widgetId: env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? "",
  };
}

export function isTawkEmbedConfigured(): boolean {
  const { propertyId, widgetId } = getTawkPublicConfig();
  return Boolean(propertyId && widgetId);
}

export function getTawkEmbedUrl(): string | null {
  const { propertyId, widgetId } = getTawkPublicConfig();
  if (!propertyId || !widgetId) return null;
  return `https://embed.tawk.to/${propertyId}/${widgetId}`;
}
