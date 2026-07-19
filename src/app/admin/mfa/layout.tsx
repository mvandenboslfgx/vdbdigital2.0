import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminWithoutMfa } from "@/server/auth/require-admin";
import { getMfaStatus } from "@/server/auth/mfa-status";
import { logoutAction } from "@/server/actions/auth-actions";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";

export default async function AdminMfaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdminWithoutMfa();
  } catch {
    redirect("/admin/login");
  }

  const mfa = await getMfaStatus();
  if (mfa?.currentLevel === "aal2") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <Link
          href="/admin"
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
            Log out
          </button>
        </form>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
