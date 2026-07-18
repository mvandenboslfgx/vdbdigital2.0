import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { MagicLinkForm } from "@/components/auth/auth-forms";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";
import { isSafeInternalPath } from "@/lib/security/redirect";

export const metadata: Metadata = {
  title: "Inloggen",
  robots: { index: false },
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
      : params.fout === "geen-toegang"
        ? "Je account heeft nog geen toegang. Vraag een uitnodiging of accountaanvraag aan."
        : null;

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Inloggen</h1>
      <p className="text-muted text-small mb-6 text-center">
        Toegang tot het beheerplatform of klantenportaal.
      </p>
      {fout && (
        <p className="text-small text-error mb-4 text-center" role="alert">
          {fout}
        </p>
      )}
      <AuthLoginForm next={next} />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-small text-muted mb-3 text-center">Of via e-mail</p>
        <MagicLinkForm />
      </div>
    </>
  );
}
