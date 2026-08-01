import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminWithoutMfa } from "@/server/auth/require-admin";
import { getMfaStatus } from "@/server/auth/mfa-status";
import { logoutAction } from "@/server/actions/auth-actions";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export default async function AdminMfaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  try {
    await requireAdminWithoutMfa();
  } catch {
    redirect(withLocale("/admin/login", locale));
  }

  const mfa = await getMfaStatus();
  if (mfa?.currentLevel === "aal2") {
    redirect(withLocale("/admin", locale));
  }

  const { t } = await getDictionary(locale);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <Link
          href={withLocale("/admin", locale)}
          className="inline-flex items-center gap-3"
          aria-label={`${siteConfig.name} Admin — MFA`}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
          <span className="text-small text-muted">MFA</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-small text-muted hover:text-foreground"
          >
            {t("mfa.logout")}
          </button>
        </form>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
