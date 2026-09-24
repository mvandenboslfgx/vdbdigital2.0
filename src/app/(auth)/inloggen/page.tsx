import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { GoogleLoginForm } from "@/components/auth/google-login-form";
import { MagicLinkForm } from "@/components/auth/auth-forms";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { isSafeInternalPath } from "@/lib/security/redirect";
import { getLocale } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inloggen",
  robots: { index: false, follow: false },
};

export default async function InloggenPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string }>;
}) {
  const params = await searchParams;
  const user = await getOptionalAuthenticatedUser();
  if (user) {
    redirect(await resolvePostLoginPath(user.id, params.next));
  }

  const locale = await getLocale();
  const next = isSafeInternalPath(params.next) ? params.next : undefined;

  const ui =
    locale === "en"
      ? {
          title: "Sign in",
          intro: "Secure access to your customer portal or management environment.",
          google: "Continue with Google",
          divider: "or with email",
          email: "Email address",
          password: "Password",
          submit: "Sign in",
          submitting: "Signing in…",
          forgot: "Forgot password?",
          requestAccount: "Create account",
          magicSummary: "Prefer a secure sign-in link by email?",
          magicHelp: "We will send a one-time sign-in link to your email address.",
          accessNote: "Signing in does not grant extra permissions. Access is determined by your VDB Digital account and organisation.",
        }
      : {
          title: "Inloggen",
          intro: "Veilige toegang tot je klantenportaal of beheeromgeving.",
          google: "Doorgaan met Google",
          divider: "of met e-mail",
          email: "E-mailadres",
          password: "Wachtwoord",
          submit: "Inloggen",
          submitting: "Bezig met inloggen…",
          forgot: "Wachtwoord vergeten?",
          requestAccount: "Account aanmaken",
          magicSummary: "Liever een beveiligde inloglink per e-mail?",
          magicHelp: "We sturen een eenmalige inloglink naar je e-mailadres.",
          accessNote: "Inloggen geeft geen extra rechten. Toegang wordt bepaald door je VDB Digital-account en organisatie.",
        };

  const fout =
    params.fout === "geblokkeerd"
      ? "Dit account is geblokkeerd. Neem contact op met VDB Digital."
      : params.fout === "sessie"
        ? "De inloglink is ongeldig of verlopen. Vraag een nieuwe link aan."
        : params.fout === "config"
          ? "Inloggen is tijdelijk niet beschikbaar. Probeer het later opnieuw."
          : params.fout === "google"
            ? locale === "en"
              ? "Google sign-in was not completed. Please try again or use email."
              : "Inloggen met Google is niet gelukt. Probeer opnieuw of gebruik je e-mailadres."
            : null;

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-h2 mb-2">{ui.title}</h1>
        <p className="text-muted text-small">{ui.intro}</p>
      </div>

      {fout ? (
        <p className="mb-4 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-center text-small text-error" role="alert">
          {fout}
        </p>
      ) : null}

      <GoogleLoginForm next={next} label={ui.google} />

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{ui.divider}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <AuthLoginForm
        next={next}
        labels={{
          email: ui.email,
          password: ui.password,
          submit: ui.submit,
          submitting: ui.submitting,
          forgot: ui.forgot,
          requestAccount: ui.requestAccount,
        }}
      />

      <details className="group mt-6 border-t border-border pt-5">
        <summary className="cursor-pointer list-none text-center text-small font-medium text-muted transition-colors hover:text-foreground">
          {ui.magicSummary}
        </summary>
        <div className="mt-4 rounded-xl border border-border bg-surface-elevated/40 p-4">
          <p className="mb-3 text-center text-xs text-muted">{ui.magicHelp}</p>
          <MagicLinkForm compact />
        </div>
      </details>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        {ui.accessNote}
      </p>
    </>
  );
}
