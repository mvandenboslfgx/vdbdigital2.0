"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/server/auth/require-customer";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { LOCALE_COOKIE, parsePreferredLocale } from "@/i18n/preference";
import {
  LOCALE_CHOICE_COOKIE,
  LOCALE_CHOICE_MAX_AGE,
  serializeLocaleChoice,
} from "@/i18n/locale-choice";
import {
  getAccountPreferredLocale,
  setAccountPreferredLocale,
} from "@/server/repositories/profile-locale";

export type LocaleActionState = {
  error?: string;
};

/**
 * Customer-facing language preference. Writes the account row, mirrors the
 * choice into cookies, then redirects so the new locale's URL prefix takes
 * effect for the rest of the session.
 */
export async function updatePreferredLocaleAction(
  _prev: LocaleActionState,
  formData: FormData,
): Promise<LocaleActionState> {
  const { t } = await getDictionary();

  if (!(await verifyOrigin())) {
    return { error: t("errors.requestDenied") };
  }

  const requested = parsePreferredLocale(String(formData.get("locale") ?? ""));
  if (!requested) {
    return { error: t("errors.somethingWentWrong") };
  }

  const ctx = await requireCustomer();
  if (!hasCustomerPermission(ctx.customerRole, "portal.profile.edit")) {
    return { error: t("errors.accessDenied") };
  }

  const previous = await getAccountPreferredLocale(ctx.user.id);
  const saved = await setAccountPreferredLocale(ctx.user.id, requested);
  if (!saved) {
    return { error: t("errors.somethingWentWrong") };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, requested, {
    path: "/",
    sameSite: "lax",
    maxAge: LOCALE_CHOICE_MAX_AGE,
  });
  cookieStore.set(
    LOCALE_CHOICE_COOKIE,
    serializeLocaleChoice({ source: "account", locale: requested }),
    { path: "/", sameSite: "lax", maxAge: LOCALE_CHOICE_MAX_AGE },
  );

  // Locale codes only — never the account's name, email or organisation.
  await writeAuditLog({
    userId: ctx.user.id,
    action: "i18n.preferred_locale_updated",
    resourceType: "profile",
    resourceId: ctx.user.id,
    metadata: { from: previous ?? "unset", to: requested, via: "portal_profile" },
  });

  redirect(withLocale("/portal/profiel", requested));
}
