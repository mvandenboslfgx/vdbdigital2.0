import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Beveiliging",
  robots: { index: false },
};

export default async function PortalSecurityPage() {
  const { t } = await getDictionary();

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-h1">{t("portal.securityPage.title")}</h1>
      <Card className="space-y-4">
        <div>
          <h2 className="font-medium mb-1">{t("portal.securityPage.passwordTitle")}</h2>
          <p className="text-small text-muted mb-3">
            {t("portal.securityPage.passwordBody")}
          </p>
          <Link
            href="/wachtwoord-vergeten"
            className="text-small text-primary hover:underline"
          >
            {t("portal.securityPage.resetPassword")}
          </Link>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">{t("portal.securityPage.mfaTitle")}</h2>
          <p className="text-small text-muted">
            {t("portal.securityPage.mfaBody")}
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="font-medium mb-1">{t("portal.securityPage.sessionsTitle")}</h2>
          <p className="text-small text-muted mb-3">
            {t("portal.securityPage.sessionsBody")}
          </p>
          <Link href="/uitloggen" className="text-small text-primary hover:underline">
            {t("portal.securityPage.logout")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
