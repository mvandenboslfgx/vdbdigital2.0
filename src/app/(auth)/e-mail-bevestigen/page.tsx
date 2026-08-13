import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { ServerLocaleLink } from "@/i18n/server-locale-link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.confirmEmailTitle"),
    robots: { index: false },
  };
}

export default async function EmailBevestigenPage() {
  const { t } = await getDictionary();

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">{t("auth.confirmEmailTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.confirmEmailBody")}</p>
      <p className="text-small text-center">
        <ServerLocaleLink href="/inloggen" className="text-primary hover:underline">
          {t("auth.confirmEmailGoToLogin")}
        </ServerLocaleLink>
      </p>
    </>
  );
}
