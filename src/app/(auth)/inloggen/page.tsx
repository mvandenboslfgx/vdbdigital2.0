import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { MagicLinkForm } from "@/components/auth/auth-forms";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { isSafeInternalPath } from "@/lib/security/redirect";
import { getDictionary, getLocale, getMessages } from "@/i18n/get-dictionary";
import { MessagesProvider } from "@/i18n/messages-provider";
import { withLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.loginTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function InloggenPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const user = await getOptionalAuthenticatedUser();
  if (user) {
    // Terminal destinations (e.g. /geen-toegang) must not bounce back here.
    const destination = await resolvePostLoginPath(user.id, params.next);
    redirect(withLocale(destination, locale));
  }

  const { t } = await getDictionary(locale);
  const messages = await getMessages(locale);

  const next = isSafeInternalPath(params.next) ? params.next : undefined;
  const fout =
    params.fout === "geblokkeerd"
      ? t("auth.errorBlocked")
      : params.fout === "sessie"
        ? t("auth.errorSessionExpired")
        : params.fout === "config"
          ? t("auth.errorConfigUnavailable")
          : null;

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <h1 className="text-h2 mb-2 text-center">{t("auth.loginTitle")}</h1>
      <p className="text-muted text-small mb-6 text-center">{t("auth.loginIntro")}</p>
      {fout && (
        <p className="text-small text-error mb-4 text-center" role="alert">
          {fout}
        </p>
      )}
      <AuthLoginForm next={next} />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-small text-muted mb-3 text-center">{t("auth.orViaEmail")}</p>
        <MagicLinkForm />
      </div>
    </MessagesProvider>
  );
}
