import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Uitnodiging accepteren",
  robots: { index: false },
};

export default async function UitnodigingAccepterenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || token.length < 32) {
    return (
      <>
        <h1 className="text-h2 mb-2 text-center">Uitnodiging</h1>
        <p className="text-muted text-small text-center">
          Deze uitnodigingslink is ongeldig of onvolledig. Vraag een nieuwe
          uitnodiging aan bij VDB Digital.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">Uitnodiging accepteren</h1>
      <p className="text-muted text-small mb-6 text-center">
        Stel je wachtwoord in om toegang te krijgen tot het klantenportaal.
      </p>
      <AcceptInvitationForm token={token} />
    </>
  );
}
