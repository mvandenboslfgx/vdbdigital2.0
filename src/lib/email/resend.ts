import "server-only";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import { escapeHtml } from "@/lib/utilities/escape-html";
import {
  getCustomerMailPreview,
  resolveMailLocale,
  type CustomerMailFamily,
} from "@/lib/email/templates";
import {
  createNotificationLocaleEvent,
  type LocaleSource,
  type NotificationLocaleEvent,
} from "@/lib/notifications/locale-event";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const from = () =>
  process.env.EMAIL_FROM ?? `noreply@${siteConfig.name.toLowerCase().replace(/\s/g, "")}.nl`;
const admin = () => process.env.EMAIL_ADMIN ?? siteConfig.contactEmail;

async function sendCustomerMail(
  to: string,
  family: CustomerMailFamily,
  locale: Locale | undefined,
  templateArgument: string,
  localeSource: LocaleSource = locale ? "form" : "default",
): Promise<{
  sent: boolean;
  reason?: string;
  localeEvent: NotificationLocaleEvent;
}> {
  const recipientLocale = resolveMailLocale(locale);
  const localeEvent = createNotificationLocaleEvent({
    eventType: `customer.${family}`,
    templateVersion: "web-customer-v1",
    recipientLocale,
    localeSource,
    data: { templateArgument },
  });
  const body = pick(family, recipientLocale, templateArgument);
  const resend = getResend();
  if (!resend) {
    return {
      sent: false,
      reason: "Email is not configured",
      localeEvent,
    };
  }

  await resend.emails.send({
    from: from(),
    to,
    subject: body.subject,
    text: body.text,
    html: body.html,
  });
  return { sent: true, localeEvent };
}

function pick(family: CustomerMailFamily, locale: Locale | undefined, arg: string) {
  return getCustomerMailPreview(family, locale, arg);
}

export async function sendContactConfirmation(
  to: string,
  name: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "contact", locale, name);
}

export async function sendContactNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale?: Locale;
}) {
  const resend = getResend();
  if (!resend) return { sent: false };

  const locale = data.locale === "nl" ? "nl" : "en";
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, "<br>");

  await resend.emails.send({
    from: from(),
    to: admin(),
    subject: `New contact message (${locale.toUpperCase()}): ${data.subject}`,
    text: `Language: ${locale}\nFrom: ${data.name} (${data.email})\n\n${data.message}`,
    html: `<p><strong>Language:</strong> ${locale}</p><p><strong>From:</strong> ${safeName} (${safeEmail})</p><p><strong>Subject:</strong> ${safeSubject}</p><p>${safeMessage}</p>`,
  });
  return { sent: true };
}

export async function sendQuoteConfirmation(
  to: string,
  name: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "quote", locale, name);
}

export async function sendQuoteNotification(data: {
  name: string;
  email: string;
  projectType: string;
  description: string;
  locale?: Locale;
}) {
  const resend = getResend();
  if (!resend) return { sent: false };
  const locale = data.locale === "nl" ? "nl" : "en";
  await resend.emails.send({
    from: from(),
    to: admin(),
    subject: `New quote request (${locale.toUpperCase()}): ${data.projectType}`,
    text: `Language: ${locale}\nFrom: ${data.name} (${data.email})\nType: ${data.projectType}\n\n${data.description}`,
    html: `<p><strong>Language:</strong> ${locale}</p><p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p><p><strong>Type:</strong> ${escapeHtml(data.projectType)}</p><p>${escapeHtml(data.description).replace(/\n/g, "<br>")}</p>`,
  });
  return { sent: true };
}

export async function sendOrderConfirmation(
  to: string,
  orderNumber: string,
  locale?: Locale,
) {
  // Orders don't persist a locale column yet — callers resolve this from the
  // buyer's session cookie at submit time (see order-service.ts createOrder).
  return sendCustomerMail(
    to,
    "orderReceived",
    locale,
    orderNumber,
    locale ? "cookie" : "default",
  );
}

export async function sendPaymentSuccess(
  to: string,
  orderNumber: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "paymentSuccess", locale, orderNumber);
}

export async function sendPaymentFailed(
  to: string,
  orderNumber: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "paymentFailed", locale, orderNumber);
}

export async function sendOrderCancelled(
  to: string,
  orderNumber: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "orderCancelled", locale, orderNumber);
}

export async function sendSupportConfirmation(
  to: string,
  name: string,
  locale?: Locale,
) {
  return sendCustomerMail(to, "support", locale, name);
}

export async function sendTestEmail(to?: string) {
  const resend = getResend();
  if (!resend) {
    return {
      sent: false,
      reason: "Set RESEND_API_KEY and EMAIL_FROM in .env.local",
    };
  }

  const recipient = to ?? admin();

  await resend.emails.send({
    from: from(),
    to: recipient,
    subject: "Hello World — VDB Digital",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
    text: "Congrats on sending your first email!",
  });

  return { sent: true, to: recipient };
}

export { getCustomerMailPreview } from "@/lib/email/templates";
