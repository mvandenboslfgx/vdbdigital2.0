import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { ServerLocaleLink } from "@/i18n/server-locale-link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.activateTitle"),
    robots: { index: false },
  };
}

export default async function AccountActiverenPage() {
  const { t } = await getDictionary();

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">{t("auth.activateTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.activateIntro")}</p>
      <ul className="text-small space-y-2 text-muted">
        <li>
          <ServerLocaleLink
            href="/uitnodiging/accepteren"
            className="text-primary hover:underline"
          >
            {t("auth.activateAcceptInvite")}
          </ServerLocaleLink>
        </li>
        <li>
          <ServerLocaleLink href="/e-mail-bevestigen" className="text-primary hover:underline">
            {t("auth.activateConfirmEmail")}
          </ServerLocaleLink>
        </li>
        <li>
          <ServerLocaleLink href="/inloggen" className="text-primary hover:underline">
            {t("auth.activateGoToLogin")}
          </ServerLocaleLink>
        </li>
      </ul>
    </>
  );
}
