/**
 * Validated locale contract for Resend / notification workers (ADR-001 §24).
 * Website/account owns preferred_locale; consumers must not invent locales.
 */

import { z } from "zod";
import { locales } from "@/i18n/config";

export const localeSourceSchema = z.enum([
  "account",
  "cookie",
  "url",
  "form",
  "accept-language",
  "default",
]);

export const notificationLocaleEventSchema = z.object({
  eventType: z.string().min(1),
  templateVersion: z.string().min(1),
  recipientLocale: z.enum(locales),
  localeSource: localeSourceSchema,
  /** Locale-safe template data only — no secrets. */
  data: z.record(z.string(), z.unknown()).default({}),
  /** Explicit English fallback payload when translation incomplete. */
  fallbackLocale: z.literal("en").default("en"),
});

export type NotificationLocaleEvent = z.infer<
  typeof notificationLocaleEventSchema
>;

export function parseNotificationLocaleEvent(
  input: unknown,
): NotificationLocaleEvent {
  return notificationLocaleEventSchema.parse(input);
}
