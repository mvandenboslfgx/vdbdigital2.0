import type { Metadata } from "next";
import { getPortalProfile } from "@/server/repositories/portal";
import { getAccountPreferredLocale } from "@/server/repositories/profile-locale";
import { ProfileForm } from "@/components/portal/profile-form";
import { LanguagePreferenceForm } from "@/components/portal/language-preference-form";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Profiel",
  robots: { index: false },
};

export default async function PortalProfilePage() {
  const { t, locale } = await getDictionary();
  const { ctx, profile } = await getPortalProfile();
  const savedLocale = await getAccountPreferredLocale(ctx.user.id);

  return (
    <div className="space-y-8 max-w-lg">
      <div className="space-y-6">
        <h1 className="text-h1">{t("portal.profilePage.title")}</h1>
        <p className="text-muted text-small">
          {t("portal.profilePage.organisation", {
            org: ctx.organization.tradeName || ctx.organization.legalName,
          })}
        </p>
        <ProfileForm
          email={profile?.email ?? ctx.user.email}
          fullName={profile?.full_name ?? ""}
        />
      </div>

      <section className="border-t border-border pt-6">
        <LanguagePreferenceForm
          currentLocale={locale}
          savedLocale={savedLocale}
          labels={{
            title: t("portal.languagePreference.title"),
            description: t("portal.languagePreference.description"),
            fieldLabel: t("portal.forms.profile.languageLabel"),
            save: t("portal.languagePreference.save"),
            saving: t("portal.languagePreference.saving"),
            notSetHint: t("portal.languagePreference.notSetHint"),
          }}
        />
      </section>
    </div>
  );
}
