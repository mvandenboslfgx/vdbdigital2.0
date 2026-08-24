import { extractEmailAddress } from "@/lib/email/address";

const SYSTEM_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
]);

export function configuredFromAddress(
  emailFrom = process.env.EMAIL_FROM,
): string | null {
  if (!emailFrom) return null;
  return extractEmailAddress(emailFrom)?.toLowerCase() ?? null;
}

export function isSystemMailbox(email: string): boolean {
  const address = extractEmailAddress(email)?.toLowerCase();
  if (!address) return false;
  const local = address.split("@")[0] ?? "";
  return SYSTEM_LOCAL_PARTS.has(local);
}

/**
 * Invitation recipient must be the customer mailbox.
 * EMAIL_FROM / noreply may never be stored or mailed as recipient.
 */
export function assertInvitationRecipient(input: {
  recipient: string;
  fromAddress?: string | null;
}): { ok: true; recipient: string } | { ok: false; error: string } {
  const recipient = extractEmailAddress(input.recipient)?.toLowerCase();
  if (!recipient) {
    return { ok: false, error: "Ongeldig uitnodigingsadres." };
  }

  const from =
    (input.fromAddress
      ? extractEmailAddress(input.fromAddress)?.toLowerCase()
      : null) ?? configuredFromAddress();

  if (from && recipient === from) {
    return {
      ok: false,
      error:
        "Het uitnodigingsadres mag niet het VDB-afzenderadres zijn. Vul het e-mailadres van de klant in.",
    };
  }

  if (isSystemMailbox(recipient)) {
    return {
      ok: false,
      error:
        "Een systeemadres (zoals noreply) kan geen klantuitnodiging ontvangen. Vul het e-mailadres van de klant in.",
    };
  }

  return { ok: true, recipient };
}

export function resolveInvitationRecipient(input: {
  contactEmail: string;
  inviteEmail?: string;
  fromAddress?: string | null;
}): { ok: true; recipient: string } | { ok: false; error: string } {
  const raw = (input.inviteEmail?.trim() || input.contactEmail).trim();
  return assertInvitationRecipient({
    recipient: raw,
    fromAddress: input.fromAddress,
  });
}
