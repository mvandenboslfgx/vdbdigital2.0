import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/server/actions/auth-actions";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import {
  isAuthNoAccessPath,
  resolvePostLoginPath,
} from "@/server/auth/resolve-home";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Geen toegang",
  robots: { index: false, follow: false },
};

function noAccessCopy(reden: string | undefined): {
  title: string;
  body: string;
} {
  if (reden === "geblokkeerd") {
    return {
      title: "Account geblokkeerd",
      body: "Je bent ingelogd, maar dit account is geblokkeerd. Neem contact op met VDB Digital Software als je denkt dat dit niet klopt.",
    };
  }
  if (reden === "tijdelijk") {
    return {
      title: "Toegang tijdelijk niet beschikbaar",
      body: "Je bent ingelogd, maar we kunnen je toegang nu niet veilig vaststellen. Probeer het later opnieuw of neem contact op met VDB Digital Software.",
    };
  }
  return {
    title: "Nog geen toegang",
    body: "Je bent ingelogd, maar er is nog geen toegang tot een organisatie of beheeromgeving gekoppeld. Toegang wordt alleen door VDB Digital Software toegewezen — niet automatisch.",
  };
}

export default async function GeenToegangPage({
  searchParams,
}: {
  searchParams: Promise<{ reden?: string }>;
}) {
  const params = await searchParams;
  const user = await getOptionalAuthenticatedUser();
  if (!user) {
    redirect("/inloggen");
  }

  const destination = await resolvePostLoginPath(user.id);
  if (!isAuthNoAccessPath(destination)) {
    redirect(destination);
  }

  const { title, body } = noAccessCopy(params.reden);
  const contactHref = siteConfig.paths.contact;
  const phone = siteConfig.company.phone;
  const email = siteConfig.contactEmail;

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">{title}</h1>
      <p className="text-muted text-small mb-6 text-center">{body}</p>
      <ul className="text-small text-muted mb-6 space-y-2 list-disc pl-5">
        <li>Vraag een uitnodiging of accountaanvraag aan bij VDB Digital Software.</li>
        <li>Of log uit en gebruik een ander account als dat van toepassing is.</li>
      </ul>
      <form action={logoutAction} className="mb-4">
        <Button type="submit" className="w-full">
          Uitloggen
        </Button>
      </form>
      <p className="text-small text-muted text-center">
        <Link href={contactHref} className="text-primary hover:underline">
          Contact opnemen
        </Link>
        {email ? (
          <>
            {" · "}
            <a href={`mailto:${email}`} className="text-primary hover:underline">
              {email}
            </a>
          </>
        ) : null}
        {phone ? (
          <>
            {" · "}
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="text-primary hover:underline"
            >
              {phone}
            </a>
          </>
        ) : null}
      </p>
    </>
  );
}
