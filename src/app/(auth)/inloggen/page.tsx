import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { GoogleLoginForm } from "@/components/auth/google-login-form";
import { MagicLinkForm } from "@/components/auth/auth-forms";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { isSafeInternalPath } from "@/lib/security/redirect";

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

  const next = isSafeInternalPath(params.next) ? params.next : undefined;
  const fout =
    params.fout === "geblokkeerd"
      ? "Dit account is geblokkeerd. Neem contact op met VDB Digital."
      : params.fout === "sessie"
        ? "De inloglink is ongeldig of verlopen. Vraag een nieuwe link aan."
        : params.fout === "config"
          ? "Inloggen is tijdelijk niet beschikbaar. Probeer het later opnieuw."
          : params.fout === "google"
            ? "Inloggen met Google is niet gelukt. Probeer opnieuw of gebruik je e-mailadres."
            : null;

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Inloggen</h1>
      <p className="text-muted text-small mb-6 text-center">
        Veilige toegang tot het beheerplatform of klantenportaal.
      </p>
      {fout && (
        <p className="text-small text-error mb-4 text-center" role="alert">
          {fout}
        </p>
      )}

      <GoogleLoginForm next={next} />

      {process.env.GOOGLE_AUTH_ENABLED === "1" ? (
        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">of</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}

      <AuthLoginForm next={next} />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-small text-muted mb-3 text-center">Of via e-mail</p>
        <MagicLinkForm />
      </div>
    </>
  );
}
