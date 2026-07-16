import type { Locale } from "@/i18n/config";
import { escapeHtml } from "@/lib/utilities/escape-html";
import { siteConfig } from "@/config/site";

export type MailBody = { subject: string; text: string; html: string };

export const customerMail = {
  contact: {
    en: (name: string): MailBody => ({
      subject: "We received your message — VDB Digital",
      text: `Hi ${name},\n\nThanks for reaching out. We will get back to you as soon as possible.\n\nBest regards,\n${siteConfig.name}`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for reaching out. We will get back to you as soon as possible.</p><p>Best regards,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
    nl: (name: string): MailBody => ({
      subject: "We hebben je bericht ontvangen — VDB Digital",
      text: `Hoi ${name},\n\nBedankt voor je bericht. We nemen zo snel mogelijk contact met je op.\n\nMet vriendelijke groet,\n${siteConfig.name}`,
      html: `<p>Hoi ${escapeHtml(name)},</p><p>Bedankt voor je bericht. We nemen zo snel mogelijk contact met je op.</p><p>Met vriendelijke groet,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
  },
  quote: {
    en: (name: string): MailBody => ({
      subject: "We received your proposal request — VDB Digital",
      text: `Hi ${name},\n\nThank you for your proposal request. We will review your project and contact you shortly.\n\nBest regards,\n${siteConfig.name}`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Thank you for your proposal request. We will review your project and contact you shortly.</p><p>Best regards,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
    nl: (name: string): MailBody => ({
      subject: "We hebben je voorstel-aanvraag ontvangen — VDB Digital",
      text: `Hoi ${name},\n\nBedankt voor je aanvraag. We bekijken je project en nemen snel contact op.\n\nMet vriendelijke groet,\n${siteConfig.name}`,
      html: `<p>Hoi ${escapeHtml(name)},</p><p>Bedankt voor je aanvraag. We bekijken je project en nemen snel contact op.</p><p>Met vriendelijke groet,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
  },
  support: {
    en: (name: string): MailBody => ({
      subject: "Support request received — VDB Digital",
      text: `Hi ${name},\n\nWe received your support request and will follow up as soon as possible.\n\nBest regards,\n${siteConfig.name}`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>We received your support request and will follow up as soon as possible.</p><p>Best regards,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
    nl: (name: string): MailBody => ({
      subject: "Supportaanvraag ontvangen — VDB Digital",
      text: `Hoi ${name},\n\nWe hebben je supportaanvraag ontvangen en volgen zo snel mogelijk op.\n\nMet vriendelijke groet,\n${siteConfig.name}`,
      html: `<p>Hoi ${escapeHtml(name)},</p><p>We hebben je supportaanvraag ontvangen en volgen zo snel mogelijk op.</p><p>Met vriendelijke groet,<br>${escapeHtml(siteConfig.name)}</p>`,
    }),
  },
  orderReceived: {
    en: (orderNumber: string): MailBody => ({
      subject: `Order received — ${orderNumber}`,
      text: `Thank you for your order (${orderNumber}). Once payment is confirmed, you will receive another confirmation.`,
      html: `<p>Thank you for your order (<strong>${escapeHtml(orderNumber)}</strong>). Once payment is confirmed, you will receive another confirmation.</p>`,
    }),
    nl: (orderNumber: string): MailBody => ({
      subject: `Bestelling ontvangen — ${orderNumber}`,
      text: `Bedankt voor je bestelling (${orderNumber}). Zodra de betaling is bevestigd, ontvang je opnieuw een bevestiging.`,
      html: `<p>Bedankt voor je bestelling (<strong>${escapeHtml(orderNumber)}</strong>). Zodra de betaling is bevestigd, ontvang je opnieuw een bevestiging.</p>`,
    }),
  },
  paymentSuccess: {
    en: (orderNumber: string): MailBody => ({
      subject: `Payment successful — ${orderNumber}`,
      text: `Your payment for order ${orderNumber} was received successfully. We will start processing it.`,
      html: `<p>Your payment for order <strong>${escapeHtml(orderNumber)}</strong> was received successfully. We will start processing it.</p>`,
    }),
    nl: (orderNumber: string): MailBody => ({
      subject: `Betaling geslaagd — ${orderNumber}`,
      text: `Je betaling voor bestelling ${orderNumber} is succesvol ontvangen. Wij starten met de verwerking.`,
      html: `<p>Je betaling voor bestelling <strong>${escapeHtml(orderNumber)}</strong> is succesvol ontvangen. Wij starten met de verwerking.</p>`,
    }),
  },
  paymentFailed: {
    en: (orderNumber: string): MailBody => ({
      subject: `Payment failed — ${orderNumber}`,
      text: `Payment for order ${orderNumber} failed. Contact us if you need help.`,
      html: `<p>Payment for order <strong>${escapeHtml(orderNumber)}</strong> failed. Contact us if you need help.</p>`,
    }),
    nl: (orderNumber: string): MailBody => ({
      subject: `Betaling mislukt — ${orderNumber}`,
      text: `De betaling voor bestelling ${orderNumber} is mislukt. Neem contact op als je hulp nodig hebt.`,
      html: `<p>De betaling voor bestelling <strong>${escapeHtml(orderNumber)}</strong> is mislukt. Neem contact op als je hulp nodig hebt.</p>`,
    }),
  },
  orderCancelled: {
    en: (orderNumber: string): MailBody => ({
      subject: `Order cancelled — ${orderNumber}`,
      text: `Order ${orderNumber} was cancelled. Your cart may still be available if you want to try again.`,
      html: `<p>Order <strong>${escapeHtml(orderNumber)}</strong> was cancelled. Your cart may still be available if you want to try again.</p>`,
    }),
    nl: (orderNumber: string): MailBody => ({
      subject: `Bestelling geannuleerd — ${orderNumber}`,
      text: `Bestelling ${orderNumber} is geannuleerd. Je winkelwagen kan nog beschikbaar zijn als je het opnieuw wilt proberen.`,
      html: `<p>Bestelling <strong>${escapeHtml(orderNumber)}</strong> is geannuleerd. Je winkelwagen kan nog beschikbaar zijn als je het opnieuw wilt proberen.</p>`,
    }),
  },
} as const;

export type CustomerMailFamily = keyof typeof customerMail;

export function resolveMailLocale(locale?: Locale): Locale {
  return locale === "nl" ? "nl" : "en";
}

export function getCustomerMailPreview(
  family: CustomerMailFamily,
  locale: Locale | undefined,
  arg: string,
): MailBody {
  const loc = resolveMailLocale(locale);
  const templates = customerMail[family];
  const fn = templates[loc] ?? templates.en;
  return fn(arg);
}
